"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isStaffRole } from "@easymatch/shared";
import { shouldRingScheduledVideoCall } from "@easymatch/shared";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMounted } from "@/hooks/use-mounted";
import { usePathname } from "@/i18n/routing";
import {
  getMemberAlertsSummary,
  invalidateMemberDiscoveryCaches,
  type MemberAlertsSummary,
} from "@/lib/member-alerts";

const POLL_MS = 5_000;
const POLL_MS_INCOMING = 2_000;
const POLL_MS_ON_CALL = 6_000;
const MIN_REFRESH_GAP_MS = 1_500;
const VIDEO_CALL_PATH = /\/(?:mobile\/video-call|messages\/[^/]+\/call)(?:\/|$)/;

function isVideoCallPath(pathname: string): boolean {
  return VIDEO_CALL_PATH.test(pathname);
}

const emptySummary: MemberAlertsSummary = {
  unreadMessages: 0,
  incomingInterests: 0,
  outgoingInterests: 0,
  connections: 0,
  incomingCalls: 0,
  incomingCallAlert: null,
  callAlerts: [],
  endedConnectionAlerts: [],
};

type MemberAlertsContextValue = {
  summary: MemberAlertsSummary;
  refresh: (options?: { forceFresh?: boolean }) => Promise<void>;
  dismissIncomingCall: (callId: string) => void;
};

const MemberAlertsContext = createContext<MemberAlertsContextValue | null>(null);

export function MemberAlertsProvider({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const pathname = usePathname();
  const onVideoCall = isVideoCallPath(pathname);
  const { user, loggedIn, ready } = useAuthSession();
  const [summary, setSummary] = useState<MemberAlertsSummary>(emptySummary);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const lastFetchedAt = useRef(0);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const isMember = ready && loggedIn && user && !isStaffRole(user.role);

  const refresh = useCallback(
    async (options?: { forceFresh?: boolean }) => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !isMember) {
        setSummary(emptySummary);
        return;
      }

      const now = Date.now();
      if (
        !options?.forceFresh &&
        now - lastFetchedAt.current < MIN_REFRESH_GAP_MS
      ) {
        return;
      }

      if (refreshInFlight.current) {
        await refreshInFlight.current;
        return;
      }

      const task = (async () => {
        try {
          if (options?.forceFresh) {
            invalidateMemberDiscoveryCaches();
          }
          const next = await getMemberAlertsSummary(
            token,
            options?.forceFresh ?? false,
          );
          setSummary(next);
          lastFetchedAt.current = Date.now();
        } catch {
          /* ignore polling errors */
        }
      })();

      refreshInFlight.current = task;
      try {
        await task;
      } finally {
        refreshInFlight.current = null;
      }
    },
    [isMember],
  );

  const dismissIncomingCall = useCallback((callId: string) => {
    setSummary((prev) => {
      const hadIncoming = prev.callAlerts.some(
        (alert) => alert.kind === "incoming" && alert.call.id === callId,
      );
      const callAlerts = prev.callAlerts.filter(
        (alert) => !(alert.kind === "incoming" && alert.call.id === callId),
      );
      return {
        ...prev,
        callAlerts,
        incomingCalls: hadIncoming
          ? Math.max(0, prev.incomingCalls - 1)
          : prev.incomingCalls,
        incomingCallAlert:
          prev.incomingCallAlert?.call.id === callId
            ? null
            : prev.incomingCallAlert,
      };
    });
  }, []);

  useEffect(() => {
    if (!mounted || !isMember) {
      setSummary(emptySummary);
      setPollingEnabled(false);
      return;
    }

    const deferTimer = window.setTimeout(() => {
      setPollingEnabled(true);
      void refresh({ forceFresh: true });
    }, 300);

    return () => window.clearTimeout(deferTimer);
  }, [isMember, mounted, refresh]);

  useEffect(() => {
    if (!mounted || !isMember) return;
    void refresh({ forceFresh: true });
  }, [isMember, mounted, refresh]);

  useEffect(() => {
    if (!mounted || !isMember || !pollingEnabled) return;

    const hasIncoming =
      summary.incomingCalls > 0 ||
      summary.callAlerts.some(
        (alert) =>
          alert.kind === "incoming" ||
          (alert.call.scheduledAt != null &&
            shouldRingScheduledVideoCall(alert.call.scheduledAt)),
      );

    const pollMs = onVideoCall
      ? POLL_MS_ON_CALL
      : hasIncoming
        ? POLL_MS_INCOMING
        : POLL_MS;

    const interval = window.setInterval(
      () => void refresh({ forceFresh: true }),
      pollMs,
    );
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh({ forceFresh: true });
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    isMember,
    mounted,
    onVideoCall,
    pollingEnabled,
    refresh,
    summary.callAlerts,
    summary.incomingCalls,
  ]);

  const value = useMemo(
    () => ({
      summary,
      refresh,
      dismissIncomingCall,
    }),
    [refresh, summary, dismissIncomingCall],
  );

  return (
    <MemberAlertsContext.Provider value={value}>
      {children}
    </MemberAlertsContext.Provider>
  );
}

export function useMemberAlerts() {
  const context = useContext(MemberAlertsContext);
  if (!context) {
    throw new Error("useMemberAlerts must be used within MemberAlertsProvider");
  }
  return context;
}
