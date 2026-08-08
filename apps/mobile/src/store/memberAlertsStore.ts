import { create } from "zustand";
import { AppState, type AppStateStatus } from "react-native";
import { invalidateConnectionsCache, refreshMemberStatusOnForeground } from "../lib/member-status-refresh";
import { getAlertsSummary } from "../services/alerts";
import type { VideoCallAlertItem } from "../types/video-calls";

const SUMMARY_POLL_MS = 3_000;
const SUMMARY_POLL_INCOMING_MS = 2_000;

type MemberAlertsState = {
  unreadMessages: number;
  incomingInterests: number;
  outgoingInterests: number;
  connections: number;
  incomingCalls: number;
  incomingCallAlert: VideoCallAlertItem | null;
  callAlerts: VideoCallAlertItem[];
  alertsSynced: boolean;
  pollingUserId: string | null;
  startPolling: (userId: string) => void;
  stopPolling: () => void;
  refresh: () => Promise<void>;
  primeIncomingCall: (connectionId: string, callId: string) => void;
  dismissIncomingCall: () => void;
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
      const keepPrimedIncoming =
        !summary.incomingCallAlert &&
        prev?.incomingCallAlert?.kind === "incoming" &&
        prev.incomingCallAlert.call.status === "ringing";
      set({
        unreadMessages: summary.unreadMessages,
        incomingInterests: summary.incomingInterests,
        outgoingInterests: summary.outgoingInterests,
        connections: summary.connections,
        incomingCalls: summary.incomingCalls,
        incomingCallAlert:
          summary.incomingCallAlert ??
          (keepPrimedIncoming ? prev!.incomingCallAlert : null),
        callAlerts: summary.callAlerts ?? [],
        alertsSynced: true,
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
  alertsSynced: false,
  pollingUserId: null,

  refresh: async () => {
    await refreshSummary(set, true, get);
  },

  primeIncomingCall: (connectionId, callId) => {
    const now = new Date().toISOString();
    set({
      incomingCalls: Math.max(1, get().incomingCalls),
      incomingCallAlert: {
        kind: "incoming",
        partnerName: null,
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
      alertsSynced: false,
    });
  },
}));
