let activeCallId: string | null = null;

export function setActiveVideoCallId(callId: string | null): void {
  activeCallId = callId?.trim() || null;
}

export function getActiveVideoCallId(): string | null {
  return activeCallId;
}

export function isActiveVideoCall(callId: string): boolean {
  return activeCallId != null && activeCallId === callId;
}
