import type { RootStackParamList } from "../navigation/types";
import { navigationRef } from "../navigation/navigationRef";
import { trySilentSessionRestore } from "./auth";
import { useAuthStore } from "../store/authStore";
import { useMemberAlertsStore } from "../store/memberAlertsStore";

export type IncomingCallNavigationParams = {
  connectionId: string;
  callId: string;
  memberName?: string;
  autoJoin?: boolean;
};

let pendingIncomingCall: IncomingCallNavigationParams | null = null;
const navigationListeners = new Set<() => void>();

function notifyIncomingCallNavigationListeners() {
  for (const listener of navigationListeners) {
    listener();
  }
}

export function subscribeIncomingCallNavigation(listener: () => void): () => void {
  navigationListeners.add(listener);
  return () => {
    navigationListeners.delete(listener);
  };
}

export function hasPendingIncomingCallNavigation(): boolean {
  return pendingIncomingCall !== null;
}

export async function restoreSessionForIncomingCall(): Promise<boolean> {
  // Someone already signed in must never wait on a network round-trip to answer
  // a call that is ringing right now; a slow or failing /me would drop the call.
  if (useAuthStore.getState().user) {
    return true;
  }

  const token = await trySilentSessionRestore();
  if (!token) {
    return false;
  }

  if (!useAuthStore.getState().user) {
    void useAuthStore.getState().bootstrap().catch(() => undefined);
  }

  return true;
}

function primeIncomingCallAlert(params: IncomingCallNavigationParams) {
  useMemberAlertsStore
    .getState()
    .primeIncomingCall(params.connectionId, params.callId, params.memberName);
}

function pushCallScreen(params: IncomingCallNavigationParams) {
  if (!navigationRef.isReady()) {
    pendingIncomingCall = params;
    notifyIncomingCallNavigationListeners();
    return false;
  }

  navigationRef.navigate("VideoCallRoom", {
    connectionId: params.connectionId,
    callId: params.callId,
    memberName: params.memberName ?? "Video call",
    autoJoin: params.autoJoin ?? true,
  });
  pendingIncomingCall = null;
  notifyIncomingCallNavigationListeners();
  return true;
}

export async function openIncomingVideoCall(
  params: IncomingCallNavigationParams,
): Promise<boolean> {
  pendingIncomingCall = params;
  notifyIncomingCallNavigationListeners();
  primeIncomingCallAlert(params);

  const hasSession = await restoreSessionForIncomingCall();
  if (!hasSession) {
    notifyIncomingCallNavigationListeners();
    return false;
  }

  return pushCallScreen(params);
}

export function flushPendingIncomingCallNavigation() {
  if (!pendingIncomingCall) {
    return;
  }
  void openIncomingVideoCall(pendingIncomingCall);
}

export function clearPendingIncomingCallNavigation() {
  pendingIncomingCall = null;
  notifyIncomingCallNavigationListeners();
}

export type RootVideoCallParams = RootStackParamList["VideoCallRoom"];
