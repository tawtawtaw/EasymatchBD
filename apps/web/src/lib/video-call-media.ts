import type { LocalParticipant, Room } from "livekit-client";
import { Track, VideoPresets } from "livekit-client";

export const VIDEO_CALL_CAPTURE = {
  resolution: VideoPresets.h360.resolution,
  frameRate: 24,
} as const;

/**
 * Must run synchronously inside click/pointer handlers (before any await).
 * Unlocks remote audio/video element playback in the browser.
 */
export function kickMediaUserGesture(
  room: Room,
  options: { audio?: boolean; video?: boolean } = {},
): void {
  const { audio = true, video = false } = options;
  if (audio) {
    void room.startAudio().catch(() => undefined);
  }
  if (video) {
    void room.startVideo().catch(() => undefined);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isRetryableMediaDeviceError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("video source") ||
    message.includes("audio source") ||
    message.includes("notreadable") ||
    message.includes("not allowed") ||
    message.includes("in use") ||
    message.includes("aborterror") ||
    message.includes("device")
  );
}

export function isRetryableCameraError(error: Error): boolean {
  return isRetryableMediaDeviceError(error);
}

export async function enableMicrophoneWithRetry(
  localParticipant: LocalParticipant,
  attempts = 3,
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
      await delay(400 * attempt);
    }

    try {
      const publication = localParticipant.getTrackPublication(
        Track.Source.Microphone,
      );
      if (publication?.isMuted) {
        await publication.unmute();
        return;
      }

      const created = await localParticipant.setMicrophoneEnabled(true, {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      });
      if (created) {
        return;
      }
      lastError =
        localParticipant.lastMicrophoneError ??
        new Error("Microphone could not be started.");
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Microphone could not be started.");
    }

    if (
      lastError &&
      !isRetryableMediaDeviceError(lastError) &&
      attempt === attempts - 1
    ) {
      throw lastError;
    }
  }

  throw lastError ?? new Error("Microphone could not be started.");
}

export async function enableCameraWithRetry(
  localParticipant: LocalParticipant,
  attempts = 3,
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await delay(500 * attempt);
      await localParticipant.setCameraEnabled(false).catch(() => undefined);
      await delay(250);
    }

    try {
      const existing = localParticipant.getTrackPublication(Track.Source.Camera);
      if (existing?.isMuted) {
        await existing.unmute();
        return;
      }

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

    if (lastError && !isRetryableMediaDeviceError(lastError) && attempt === attempts - 1) {
      throw lastError;
    }
  }

  throw lastError ?? new Error("Camera could not be started.");
}
