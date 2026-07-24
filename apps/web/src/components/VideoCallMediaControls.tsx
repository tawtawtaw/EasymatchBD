"use client";

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { enableCameraWithRetry } from "@/lib/video-call-media";

type VideoCallMediaControlsProps = {
  compact?: boolean;
  showEndCall?: boolean;
  ending?: boolean;
  onEndCall?: () => void;
  onDeviceError?: (source: Track.Source, error: Error) => void;
};

export function VideoCallMediaControls({
  compact = false,
  showEndCall = false,
  ending = false,
  onEndCall,
  onDeviceError,
}: VideoCallMediaControlsProps) {
  const t = useTranslations("videoCalls.controls");
  const tc = useTranslations("videoCalls");
  const room = useRoomContext();
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    lastCameraError,
    lastMicrophoneError,
  } = useLocalParticipant();
  const [pending, setPending] = useState<"mic" | "camera" | null>(null);

  useEffect(() => {
    if (lastCameraError) {
      onDeviceError?.(Track.Source.Camera, lastCameraError);
    }
  }, [lastCameraError, onDeviceError]);

  useEffect(() => {
    if (lastMicrophoneError) {
      onDeviceError?.(Track.Source.Microphone, lastMicrophoneError);
    }
  }, [lastMicrophoneError, onDeviceError]);

  const unlockPlayback = useCallback(async () => {
    await room.startAudio();
    await room.startVideo();
  }, [room]);

  const toggleMic = useCallback(async () => {
    if (pending) return;
    setPending("mic");
    try {
      await unlockPlayback();
      const publication = await localParticipant.setMicrophoneEnabled(
        !isMicrophoneEnabled,
      );
      if (!isMicrophoneEnabled && !publication) {
        throw (
          localParticipant.lastMicrophoneError ??
          new Error(t("micEnableFailed"))
        );
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error(t("micEnableFailed"));
      onDeviceError?.(Track.Source.Microphone, err);
    } finally {
      setPending(null);
    }
  }, [
    pending,
    unlockPlayback,
    localParticipant,
    isMicrophoneEnabled,
    onDeviceError,
    t,
  ]);

  const setCamera = useCallback(
    async (targetEnabled: boolean) => {
      if (targetEnabled) {
        const publication = localParticipant.getTrackPublication(
          Track.Source.Camera,
        );
        if (publication?.isMuted) {
          await publication.unmute();
          return;
        }
        await enableCameraWithRetry(localParticipant);
        return;
      }
      await localParticipant.setCameraEnabled(false);
    },
    [localParticipant],
  );

  const toggleCamera = useCallback(async () => {
    if (pending) return;
    setPending("camera");
    const targetEnabled = !isCameraEnabled;
    try {
      await unlockPlayback();
      await setCamera(targetEnabled);
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error(t("cameraEnableFailed"));
      onDeviceError?.(Track.Source.Camera, err);
    } finally {
      setPending(null);
    }
  }, [pending, unlockPlayback, setCamera, isCameraEnabled, onDeviceError, t]);

  const buttonClass = compact
    ? "min-h-11 rounded-full px-3 py-2.5 text-xs font-semibold sm:text-sm"
    : "min-h-10 rounded-full px-4 py-2 text-sm font-semibold";

  return (
    <div
      className="easymatch-media-controls flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-zinc-700 bg-zinc-900 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
      role="toolbar"
      aria-label={t("toolbar")}
    >
      <button
        type="button"
        className={`${buttonClass} ${
          isMicrophoneEnabled
            ? "bg-zinc-700 text-white hover:bg-zinc-600"
            : "bg-red-800 text-white hover:bg-red-700"
        } disabled:opacity-60`}
        aria-pressed={isMicrophoneEnabled}
        disabled={pending === "mic"}
        onClick={() => void toggleMic()}
      >
        {isMicrophoneEnabled ? t("micOn") : t("micOff")}
      </button>
      <button
        type="button"
        className={`${buttonClass} ${
          isCameraEnabled
            ? "bg-zinc-700 text-white hover:bg-zinc-600"
            : "bg-red-800 text-white hover:bg-red-700"
        } disabled:opacity-60`}
        aria-pressed={isCameraEnabled}
        disabled={pending === "camera"}
        onClick={() => void toggleCamera()}
      >
        {isCameraEnabled ? t("cameraOn") : t("cameraOff")}
      </button>
      {showEndCall ? (
        <button
          type="button"
          disabled={ending}
          onClick={onEndCall}
          className={`${buttonClass} bg-red-700 text-white hover:bg-red-600 disabled:opacity-60`}
        >
          {tc("endCall")}
        </button>
      ) : null}
    </div>
  );
}
