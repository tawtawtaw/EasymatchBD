/** Hard cap on an in-progress video call, measured from `startedAt`. */
export const VIDEO_CALL_MAX_DURATION_MS = 60 * 60 * 1000;

/** Show a countdown this long before the hard cap. */
export const VIDEO_CALL_DURATION_WARNING_MS = 2 * 60 * 1000;

/**
 * Wait this long after a call becomes active with nobody in the LiveKit room
 * before treating it as abandoned. Also used as LiveKit empty/departure timeout
 * so brief reconnects and app-switching do not hang up the call.
 */
export const VIDEO_CALL_EMPTY_ROOM_GRACE_MS = 2 * 60 * 1000;

const MAX_LIVEKIT_TTL_SECONDS = Math.ceil(
  (VIDEO_CALL_MAX_DURATION_MS + VIDEO_CALL_DURATION_WARNING_MS) / 1000,
);

function startedAtMs(startedAt: Date | string | null | undefined): number | null {
  if (!startedAt) return null;
  const at =
    startedAt instanceof Date ? startedAt.getTime() : new Date(startedAt).getTime();
  return Number.isNaN(at) ? null : at;
}

export function videoCallRemainingMs(
  startedAt: Date | string | null | undefined,
  now = Date.now(),
): number | null {
  const at = startedAtMs(startedAt);
  if (at == null) return null;
  return VIDEO_CALL_MAX_DURATION_MS - (now - at);
}

export function isVideoCallPastMaxDuration(
  startedAt: Date | string | null | undefined,
  now = Date.now(),
): boolean {
  const remaining = videoCallRemainingMs(startedAt, now);
  return remaining != null && remaining <= 0;
}

export function shouldWarnVideoCallDuration(
  startedAt: Date | string | null | undefined,
  now = Date.now(),
): boolean {
  const remaining = videoCallRemainingMs(startedAt, now);
  return (
    remaining != null &&
    remaining > 0 &&
    remaining <= VIDEO_CALL_DURATION_WARNING_MS
  );
}

/** LiveKit token lifetime: leftover call time plus a short buffer, capped at 62 minutes. */
export function videoCallLiveKitTtlSeconds(
  startedAt: Date | string | null | undefined,
  now = Date.now(),
): number {
  const remaining = videoCallRemainingMs(startedAt, now);
  if (remaining == null) return MAX_LIVEKIT_TTL_SECONDS;
  return Math.max(60, Math.min(MAX_LIVEKIT_TTL_SECONDS, Math.ceil((remaining + 120_000) / 1000)));
}

/** Countdown like 2:00 or 0:09 */
export function formatVideoCallRemaining(ms: number): string {
  const safe = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
