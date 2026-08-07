export type AndroidIncomingCallPayload = {
  connectionId: string;
  callId: string;
  memberName?: string;
};

export function parseAndroidCallPushData(
  data: Record<string, unknown>,
): AndroidIncomingCallPayload | null {
  const connectionId =
    typeof data.connectionId === "string" ? data.connectionId : null;
  const callId = typeof data.callId === "string" ? data.callId : null;
  if (!connectionId || !callId) {
    return null;
  }
  const memberName =
    typeof data.callerName === "string"
      ? data.callerName
      : typeof data.memberName === "string"
        ? data.memberName
        : undefined;
  return { connectionId, callId, memberName };
}
