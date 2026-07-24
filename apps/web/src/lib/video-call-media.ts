import type { LocalParticipant } from "livekit-client";
import { VideoPresets } from "livekit-client";

export const VIDEO_CALL_CAPTURE = {
  resolution: VideoPresets.h360.resolution,
  frameRate: 24,
} as const;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isRetryableCameraError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("video source") ||
    message.includes("notreadable") ||
    message.includes("in use") ||
    message.includes("aborterror")
  );
}

export async function enableCameraWithRetry(
  localParticipant: LocalParticipant,
  attempts = 3,
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await localParticipant.setCameraEnabled(false).catch(() => undefined);
      await delay(500 * attempt);
    }

    try {
      const publication = await localParticipant.setCameraEnabled(
        true,
        VIDEO_CALL_CAPTURE,
      );
      if (publication) {
        return;
      }
      lastError =
        localParticipant.lastCameraError ??
        new Error("Camera could not be started.");
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Camera could not be started.");
    }

    if (lastError && !isRetryableCameraError(lastError) && attempt === attempts - 1) {
      throw lastError;
    }
  }

  throw lastError ?? new Error("Camera could not be started.");
}
