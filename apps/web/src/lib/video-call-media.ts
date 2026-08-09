import type { LocalParticipant, Room } from "livekit-client";
import { Track, VideoPresets } from "livekit-client";
import { isNativeVideoCallShell } from "@/lib/mobile-video-call";

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

/**
 * getUserMedia can hang forever in the Android WebView instead of rejecting,
 * which would otherwise wedge the caller's pending state. "timeout" is a
 * retryable message, so a stalled attempt is simply retried.
 */
const MEDIA_ENABLE_TIMEOUT_MS = 8000;

export function isMediaTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "MediaTimeoutError";
}

function withMediaTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  // A browser may be showing its own permission prompt, which the user can
  // take any amount of time to answer, so only bound this inside the WebView.
  if (!isNativeVideoCallShell()) return promise;

  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      const error = new Error(`${label} timeout`);
      error.name = "MediaTimeoutError";
      reject(error);
    }, MEDIA_ENABLE_TIMEOUT_MS);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
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

/**
 * Some Android WebViews never settle getUserMedia when the audio processing
 * constraints are set, so the second attempt asks for a plain capture. Each
 * stalled attempt leaves a request pending in the WebView and blocks later
 * camera capture, so keep the ladder short.
 */
const MICROPHONE_CONSTRAINTS = [
  { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
  { autoGainControl: false, echoCancellation: false, noiseSuppression: false },
];

export async function enableMicrophoneWithRetry(
  localParticipant: LocalParticipant,
  attempts = MICROPHONE_CONSTRAINTS.length,
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
        await withMediaTimeout(publication.unmute(), "microphone");
        return;
      }

      const created = await withMediaTimeout(
        localParticipant.setMicrophoneEnabled(
          true,
          MICROPHONE_CONSTRAINTS[
            Math.min(attempt, MICROPHONE_CONSTRAINTS.length - 1)
          ],
        ),
        "microphone",
      );
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

/**
 * Stopping a track does not release the device in time to take it again in the
 * Android WebView, so toggles mute the published track instead of ending it.
 */
export async function setNativeCallTrackMuted(
  localParticipant: LocalParticipant,
  source: Track.Source.Microphone | Track.Source.Camera,
  muted: boolean,
): Promise<void> {
  const publication = localParticipant.getTrackPublication(source);
  if (!publication || publication.isMuted === muted) return;

  await withMediaTimeout(
    muted ? publication.mute() : publication.unmute(),
    source === Track.Source.Microphone ? "microphone" : "camera",
  );
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
        await withMediaTimeout(existing.unmute(), "camera");
        return;
      }

      const publication = await withMediaTimeout(
        localParticipant.setCameraEnabled(true, VIDEO_CALL_CAPTURE),
        "camera",
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

    // A stalled request stays pending in the WebView; retrying only adds more.
    if (isMediaTimeoutError(lastError)) {
      throw lastError;
    }

    if (lastError && !isRetryableMediaDeviceError(lastError) && attempt === attempts - 1) {
      throw lastError;
    }
  }

  throw lastError ?? new Error("Camera could not be started.");
}
