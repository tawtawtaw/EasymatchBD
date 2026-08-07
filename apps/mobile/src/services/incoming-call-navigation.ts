import type { RootStackParamList } from "../navigation/types";
import { navigationRef } from "../navigation/navigationRef";
import { acceptVideoCall } from "./video-calls";
import { sessionStorage } from "./session-storage";
import { useAuthStore } from "../store/authStore";
import { useMemberAlertsStore } from "../store/memberAlertsStore";

export type IncomingCallNavigationParams = {
  connectionId: string;
  callId: string;
  memberName?: string;
  autoJoin?: boolean;
};

let pendingIncomingCall: IncomingCallNavigationParams | null = null;

export async function restoreSessionForIncomingCall(): Promise<boolean> {
  const token = await sessionStorage.getAccessToken();
  if (!token) {
    return false;
  }
  if (useAuthStore.getState().user) {
    return true;
  }
  try {
    await useAuthStore.getState().bootstrap();
  } catch {
    /* WebView may still use stored JWT */
  }
  return Boolean(
    useAuthStore.getState().user ?? (await sessionStorage.getAccessToken()),
  );
}

function primeIncomingCallAlert(params: IncomingCallNavigationParams) {
  useMemberAlertsStore
    .getState()
    .primeIncomingCall(params.connectionId, params.callId);
}

function pushCallScreen(params: IncomingCallNavigationParams) {
  if (!navigationRef.isReady()) {
    pendingIncomingCall = params;
    return false;
  }

  navigationRef.navigate("VideoCallRoom", {
    connectionId: params.connectionId,
    callId: params.callId,
    memberName: params.memberName ?? "Video call",
    autoJoin: params.autoJoin ?? true,
  });
  pendingIncomingCall = null;
  return true;
}

export async function openIncomingVideoCall(
  params: IncomingCallNavigationParams,
): Promise<boolean> {
  pendingIncomingCall = params;
  primeIncomingCallAlert(params);

  const hasSession = await restoreSessionForIncomingCall();
  if (!hasSession) {
    return false;
  }

  if (params.autoJoin !== false) {
    void acceptVideoCall(params.callId).catch(() => {
      /* call room / WebView retries accept */
    });
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
}

export type RootVideoCallParams = RootStackParamList["VideoCallRoom"];
