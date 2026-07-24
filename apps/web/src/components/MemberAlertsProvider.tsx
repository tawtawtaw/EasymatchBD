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
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { useAuthSession, useAuthSessionPollDeferMs } from "@/hooks/use-auth-session";
import { useMounted } from "@/hooks/use-mounted";
import { usePathname } from "@/i18n/routing";
import {
  getMemberAlertsSummary,
  invalidateMemberDiscoveryCaches,
  type MemberAlertsSummary,
} from "@/lib/member-alerts";

const POLL_MS = 20_000;
const MIN_REFRESH_GAP_MS = 8_000;
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
};

type MemberAlertsContextValue = {
  summary: MemberAlertsSummary;
  refresh: (options?: { forceFresh?: boolean }) => Promise<void>;
};

const MemberAlertsContext = createContext<MemberAlertsContextValue | null>(null);

export function MemberAlertsProvider({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const pathname = usePathname();
  const onVideoCall = isVideoCallPath(pathname);
  const { user, loggedIn, ready } = useAuthSession();
  const pollDeferMs = useAuthSessionPollDeferMs();
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

  useEffect(() => {
    if (!mounted || !isMember) {
      setSummary(emptySummary);
      setPollingEnabled(false);
      return;
    }

    const deferTimer = window.setTimeout(() => {
      setPollingEnabled(true);
      void refresh({ forceFresh: true });
    }, pollDeferMs);

    return () => window.clearTimeout(deferTimer);
  }, [isMember, mounted, pollDeferMs, refresh]);

  useEffect(() => {
    if (!mounted || !isMember || !pollingEnabled || onVideoCall) return;

    const interval = window.setInterval(() => void refresh(), POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !isVideoCallPath(pathname)) {
        void refresh({ forceFresh: true });
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isMember, mounted, onVideoCall, pathname, pollingEnabled, refresh]);

  const value = useMemo(
    () => ({
      summary,
      refresh,
    }),
    [refresh, summary],
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
