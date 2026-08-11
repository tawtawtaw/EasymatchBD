let activeCallId: string | null = null;
const subscribers = new Set<() => void>();

export function setActiveVideoCallId(callId: string | null): void {
  const next = callId?.trim() || null;
  if (next === activeCallId) return;
  activeCallId = next;
  for (const notify of subscribers) notify();
}

export function subscribeActiveVideoCall(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

export function getActiveVideoCallId(): string | null {
  return activeCallId;
}

export function isActiveVideoCall(callId: string): boolean {
  return activeCallId != null && activeCallId === callId;
}
