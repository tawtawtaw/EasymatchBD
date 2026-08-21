"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "@/i18n/routing";
import { useMemberAlerts } from "@/components/MemberAlertsProvider";
import { useScheduledCallRingAlert } from "@/hooks/use-scheduled-call-ring";
import { useVideoCallRingtone } from "@/hooks/use-video-call-ringtone";

const VIDEO_CALL_PATH = /\/(?:mobile\/video-call|messages\/[^/]+\/call)(?:\/|$)/;

export type GlobalCallPhase =
  | "idle"
  | "loading"
  | "ringing-in"
  | "ringing-out"
  | "connecting"
  | "active"
  | "ended";

export type GlobalCallSession = {
  callId: string;
  connectionId: string;
  memberName?: string;
  phase: GlobalCallPhase;
  joining?: boolean;
  livekit?: {
    url: string;
    token: string;
    sessionKey: number;
  };
  startedAt?: string | null;
};

type GlobalCallSessionContextValue = {
  session: GlobalCallSession | null;
  suppressedIncomingCallIds: ReadonlySet<string>;
  setCallSession: (
    next:
      | GlobalCallSession
      | null
      | ((current: GlobalCallSession | null) => GlobalCallSession | null),
  ) => void;
  patchCallSession: (patch: Partial<GlobalCallSession>) => void;
  suppressIncomingCall: (callId: string) => void;
  clearCallSession: () => void;
  isIncomingCallSuppressed: (callId: string) => boolean;
};

const GlobalCallSessionContext =
  createContext<GlobalCallSessionContextValue | null>(null);

function isVideoCallPath(pathname: string): boolean {
  return VIDEO_CALL_PATH.test(pathname);
}

function phaseFromCallStatus(
  status: string | undefined,
  isInitiator: boolean,
): GlobalCallPhase {
  switch (status) {
    case "ringing":
      return isInitiator ? "ringing-out" : "ringing-in";
    case "active":
      return "active";
    case "completed":
    case "cancelled":
    case "declined":
    case "missed":
      return "ended";
    default:
      return "loading";
  }
}

export function GlobalCallSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary } = useMemberAlerts();
  const [session, setSession] = useState<GlobalCallSession | null>(null);
  const [suppressedIncomingCallIds, setSuppressedIncomingCallIds] = useState<
    Set<string>
  >(() => new Set());

  const suppressIncomingCall = useCallback((callId: string) => {
    setSuppressedIncomingCallIds((prev) => {
      if (prev.has(callId)) return prev;
      const next = new Set(prev);
      next.add(callId);
      return next;
    });
  }, []);

  const clearCallSession = useCallback(() => {
    setSession(null);
  }, []);

  const setCallSession = useCallback(
    (next: GlobalCallSession | null | ((current: GlobalCallSession | null) => GlobalCallSession | null)) => {
      setSession(next);
    },
    [],
  );

  const patchCallSession = useCallback((patch: Partial<GlobalCallSession>) => {
    setSession((current) => {
      if (!current) return current;
      return { ...current, ...patch };
    });
  }, []);

  const isIncomingCallSuppressed = useCallback(
    (callId: string) => suppressedIncomingCallIds.has(callId),
    [suppressedIncomingCallIds],
  );

  const scheduledRingAlert = useScheduledCallRingAlert(
    summary.callAlerts,
    suppressedIncomingCallIds,
  );

  const ringtoneKind = useMemo((): "incoming" | "outgoing" | null => {
    const onCallPage = isVideoCallPath(pathname);

    const incomingAlert = summary.callAlerts?.find(
      (alert) =>
        alert.kind === "incoming" &&
        !suppressedIncomingCallIds.has(alert.call.id),
    );
    const legacyIncoming =
      summary.incomingCallAlert?.kind === "incoming" &&
      !suppressedIncomingCallIds.has(summary.incomingCallAlert.call.id)
        ? summary.incomingCallAlert
        : null;

    if ((incomingAlert || legacyIncoming) && !onCallPage) {
      return "incoming";
    }

    if (scheduledRingAlert && !onCallPage) {
      if (
        session?.callId === scheduledRingAlert.call.id &&
        (session.joining ||
          session.phase === "connecting" ||
          session.phase === "active")
      ) {
        return null;
      }
      return "incoming";
    }

    if (session) {
      if (
        session.joining ||
        session.phase === "connecting" ||
        session.phase === "active" ||
        session.phase === "ended"
      ) {
        return null;
      }
      if (onCallPage && session.callId) {
        if (session.phase === "ringing-in") return "incoming";
        if (session.phase === "ringing-out") return "outgoing";
        return null;
      }
    }

    return null;
  }, [
    pathname,
    scheduledRingAlert,
    session,
    summary.callAlerts,
    summary.incomingCallAlert,
    suppressedIncomingCallIds,
  ]);

  useVideoCallRingtone(ringtoneKind != null, ringtoneKind);

  const value = useMemo(
    () => ({
      session,
      suppressedIncomingCallIds,
      setCallSession,
      patchCallSession,
      suppressIncomingCall,
      clearCallSession,
      isIncomingCallSuppressed,
    }),
    [
      session,
      suppressedIncomingCallIds,
      setCallSession,
      patchCallSession,
      suppressIncomingCall,
      clearCallSession,
      isIncomingCallSuppressed,
    ],
  );

  return (
    <GlobalCallSessionContext.Provider value={value}>
      {children}
    </GlobalCallSessionContext.Provider>
  );
}

export function useGlobalCallSession() {
  const context = useContext(GlobalCallSessionContext);
  if (!context) {
    throw new Error(
      "useGlobalCallSession must be used within GlobalCallSessionProvider",
    );
  }
  return context;
}

export { phaseFromCallStatus, isVideoCallPath };
