import {
  parseAndroidCallPushData,
  type AndroidIncomingCallPayload,
} from "./incoming-call-push";

export type { AndroidIncomingCallPayload };
export { parseAndroidCallPushData };

/** ConnectionService (CallKeep) disabled in release builds until native stack is stable. */
export function isAndroidConnectionServiceEnabled() {
  return false;
}

export async function setupAndroidIncomingCallTelecom(): Promise<boolean> {
  return false;
}

export async function presentAndroidIncomingCallTelecom(
  _payload: AndroidIncomingCallPayload,
): Promise<boolean> {
  return false;
}

export async function endAndroidTelecomCall(_callId: string) {
  /* no-op */
}
