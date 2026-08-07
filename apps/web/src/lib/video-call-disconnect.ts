import { DisconnectReason } from "livekit-client";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { endVideoCall } from "@/lib/video-calls";

export const VIDEO_CALL_MAX_RECONNECT_ATTEMPTS = 3;

const FATAL_LIVEKIT_DISCONNECT = new Set<DisconnectReason>([
  DisconnectReason.ROOM_DELETED,
  DisconnectReason.PARTICIPANT_REMOVED,
  DisconnectReason.DUPLICATE_IDENTITY,
  DisconnectReason.SERVER_SHUTDOWN,
  DisconnectReason.JOIN_FAILURE,
  DisconnectReason.MIGRATION,
]);

export function shouldEndCallAfterLiveKitDisconnect(
  reason?: DisconnectReason,
): boolean {
  if (reason === DisconnectReason.CLIENT_INITIATED) {
    return false;
  }
  if (reason == null) {
    return false;
  }
  return FATAL_LIVEKIT_DISCONNECT.has(reason);
}

function isCallAlreadyEndedError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.toLowerCase().includes("not in progress");
}

/** Best-effort: mark the call completed on the API so both members leave "rejoin" state. */
export async function persistVideoCallEnded(callId: string): Promise<boolean> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return false;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await endVideoCall(token, callId);
      return true;
    } catch (err) {
      if (isCallAlreadyEndedError(err)) {
        return true;
      }
      if (attempt < 4) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1200 * (attempt + 1)),
        );
      }
    }
  }
  return false;
}
