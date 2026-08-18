import { create } from "zustand";
import { AppState, type AppStateStatus } from "react-native";
import { shouldRingScheduledVideoCall } from "@easymatch/shared";
import { invalidateConnectionsCache, refreshMemberStatusOnForeground } from "../lib/member-status-refresh";
import { getAlertsSummary, type EndedConnectionAlert } from "../services/alerts";
import type { VideoCallAlertItem } from "../types/video-calls";

const SUMMARY_POLL_MS = 3_000;
const SUMMARY_POLL_INCOMING_MS = 2_000;
const SUPPRESSED_CALL_TTL_MS = 10 * 60 * 1000;

function pruneSuppressedCallIds(
  suppressedCallIds: Record<string, number>,
): Record<string, number> {
  const now = Date.now();
  const next: Record<string, number> = {};
  for (const [callId, at] of Object.entries(suppressedCallIds)) {
    if (now - at < SUPPRESSED_CALL_TTL_MS) {
      next[callId] = at;
    }
  }
  return next;
}

function isSuppressedCallId(
  suppressedCallIds: Record<string, number>,
  callId: string,
): boolean {
  const at = suppressedCallIds[callId];
  if (!at) return false;
  return Date.now() - at < SUPPRESSED_CALL_TTL_MS;
}

function sanitizeIncomingCallAlert(
  alert: VideoCallAlertItem | null | undefined,
  suppressedCallIds: Record<string, number>,
): VideoCallAlertItem | null {
  if (!alert) return null;
  if (isSuppressedCallId(suppressedCallIds, alert.call.id)) {
    return null;
  }
  if (alert.kind === "incoming" && alert.call.status !== "ringing") {
    return null;
  }
  return alert;
}

function sanitizeCallAlerts(
  alerts: VideoCallAlertItem[],
  suppressedCallIds: Record<string, number>,
): VideoCallAlertItem[] {
  return alerts.filter(
    (alert) =>
      !isSuppressedCallId(suppressedCallIds, alert.call.id) &&
      !(alert.kind === "incoming" && alert.call.status !== "ringing"),
  );
}

type MemberAlertsState = {
  unreadMessages: number;
  incomingInterests: number;
  outgoingInterests: number;
  connections: number;
  incomingCalls: number;
  incomingCallAlert: VideoCallAlertItem | null;
  callAlerts: VideoCallAlertItem[];
  endedConnectionAlerts: EndedConnectionAlert[];
  alertsSynced: boolean;
  pollingUserId: string | null;
  suppressedCallIds: Record<string, number>;
  startPolling: (userId: string) => void;
  stopPolling: () => void;
  refresh: () => Promise<void>;
  primeIncomingCall: (
    connectionId: string,
    callId: string,
    partnerName?: string | null,
  ) => void;
  dismissIncomingCall: () => void;
  markCallHandled: (callId: string) => void;
  isCallSuppressed: (callId: string) => boolean;
  pausePolling: () => void;
  resumePolling: () => void;
};

let summaryTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
let pollingUserId: string | null = null;
let refreshInFlight: Promise<void> | null = null;
let pollingPaused = false;

function clearSummaryTimer() {
  if (summaryTimer) {
    clearInterval(summaryTimer);
    summaryTimer = null;
  }
}

function summaryPollIntervalMs(state: MemberAlertsState) {
  if (state.incomingCallAlert?.kind === "incoming" || state.incomingCalls > 0) {
    return SUMMARY_POLL_INCOMING_MS;
  }
  if (
    state.callAlerts.some(
      (alert) =>
        alert.call.scheduledAt != null &&
        shouldRingScheduledVideoCall(alert.call.scheduledAt),
    )
  ) {
    return SUMMARY_POLL_INCOMING_MS;
  }
  return SUMMARY_POLL_MS;
}

function startSummaryTimer(
  set: (partial: Partial<MemberAlertsState>) => void,
  getState: () => MemberAlertsState,
) {
  clearSummaryTimer();
  if (pollingPaused) return;
  const tick = () => {
    void refreshSummary(set, false, getState);
  };
  tick();
  summaryTimer = setInterval(tick, summaryPollIntervalMs(getState()));
}

async function refreshSummary(
  set: (partial: Partial<MemberAlertsState>) => void,
  forceFresh = false,
  getState?: () => MemberAlertsState,
) {
  if (refreshInFlight) {
    await refreshInFlight;
    return;
  }

  refreshInFlight = (async () => {
    try {
      if (forceFresh) {
        invalidateConnectionsCache();
      }
      const summary = await getAlertsSummary(forceFresh);
      const prev = getState?.();
      const suppressedCallIds = pruneSuppressedCallIds(
        prev?.suppressedCallIds ?? {},
      );
      const keepPrimedIncoming =
        !summary.incomingCallAlert &&
        prev?.incomingCallAlert?.kind === "incoming" &&
        prev.incomingCallAlert.call.status === "ringing" &&
        !isSuppressedCallId(suppressedCallIds, prev.incomingCallAlert.call.id);
      const incomingCallAlert = sanitizeIncomingCallAlert(
        summary.incomingCallAlert ??
          (keepPrimedIncoming ? prev!.incomingCallAlert : null),
        suppressedCallIds,
      );
      set({
        unreadMessages: summary.unreadMessages,
        incomingInterests: summary.incomingInterests,
        outgoingInterests: summary.outgoingInterests,
        connections: summary.connections,
        incomingCalls: incomingCallAlert ? Math.max(1, summary.incomingCalls) : 0,
        incomingCallAlert,
        callAlerts: sanitizeCallAlerts(summary.callAlerts ?? [], suppressedCallIds),
        endedConnectionAlerts: summary.endedConnectionAlerts ?? [],
        alertsSynced: true,
        suppressedCallIds,
      });
    } catch {
      // ignore polling errors
    }
  })();

  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export const useMemberAlertsStore = create<MemberAlertsState>((set, get) => ({
  unreadMessages: 0,
  incomingInterests: 0,
  outgoingInterests: 0,
  connections: 0,
  incomingCalls: 0,
  incomingCallAlert: null,
  callAlerts: [],
  endedConnectionAlerts: [],
  alertsSynced: false,
  pollingUserId: null,
  suppressedCallIds: {},

  refresh: async () => {
    await refreshSummary(set, true, get);
  },

  primeIncomingCall: (connectionId, callId, partnerName) => {
    if (get().isCallSuppressed(callId)) {
      return;
    }
    const now = new Date().toISOString();
    const existing = get().incomingCallAlert;
    // Never trade a name we already resolved for the anonymous placeholder.
    const knownName =
      partnerName?.trim() ||
      (existing?.call.id === callId ? existing.partnerName : null) ||
      null;
    set({
      incomingCalls: Math.max(1, get().incomingCalls),
      incomingCallAlert: {
        kind: "incoming",
        partnerName: knownName,
        call: {
          id: callId,
          connectionId,
          initiatorId: "",
          isInitiator: false,
          scheduledAt: null,
          status: "ringing",
          startedAt: null,
          endedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      },
    });
    startSummaryTimer(set, get);
  },

  dismissIncomingCall: () => {
    set({
      incomingCallAlert: null,
      incomingCalls: 0,
    });
  },

  markCallHandled: (callId) => {
    const trimmed = callId.trim();
    if (!trimmed) return;
    set((state) => {
      const suppressedCallIds = {
        ...pruneSuppressedCallIds(state.suppressedCallIds),
        [trimmed]: Date.now(),
      };
      const dropIncoming = state.incomingCallAlert?.call.id === trimmed;
      return {
        suppressedCallIds,
        incomingCallAlert: dropIncoming ? null : state.incomingCallAlert,
        incomingCalls: dropIncoming ? 0 : state.incomingCalls,
        callAlerts: state.callAlerts.filter(
          (alert) => alert.call.id !== trimmed,
        ),
      };
    });
  },

  isCallSuppressed: (callId) => {
    return isSuppressedCallId(get().suppressedCallIds, callId.trim());
  },

  pausePolling: () => {
    pollingPaused = true;
    clearSummaryTimer();
  },

  resumePolling: () => {
    pollingPaused = false;
    if (pollingUserId) {
      startSummaryTimer(set, get);
    }
  },

  startPolling: (userId) => {
    if (pollingUserId === userId && summaryTimer) {
      return;
    }

    pollingUserId = userId;
    clearSummaryTimer();
    if (appStateSub) {
      appStateSub.remove();
      appStateSub = null;
    }

    invalidateConnectionsCache();

    set({
      pollingUserId: userId,
      unreadMessages: 0,
      incomingInterests: 0,
      outgoingInterests: 0,
      connections: 0,
      incomingCalls: 0,
      incomingCallAlert: null,
      callAlerts: [],
      endedConnectionAlerts: [],
      alertsSynced: false,
    });

    void get().refresh();
    startSummaryTimer(set, get);

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== "active") {
        clearSummaryTimer();
        return;
      }

      void refreshMemberStatusOnForeground();
      void get().refresh();
      if (pollingUserId) {
        startSummaryTimer(set, get);
      }
    };

    appStateSub = AppState.addEventListener("change", onAppStateChange);
  },

  stopPolling: () => {
    pollingUserId = null;
    clearSummaryTimer();
    if (appStateSub) {
      appStateSub.remove();
      appStateSub = null;
    }
    set({
      pollingUserId: null,
      unreadMessages: 0,
      incomingInterests: 0,
      outgoingInterests: 0,
      connections: 0,
      incomingCalls: 0,
      incomingCallAlert: null,
      callAlerts: [],
      endedConnectionAlerts: [],
      alertsSynced: false,
    });
  },
}));
