"use client";

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type TouchEvent } from "react";
import {
  enableCameraWithRetry,
  enableMicrophoneWithRetry,
  kickMediaUserGesture,
} from "@/lib/video-call-media";

type VideoCallMediaControlsProps = {
  compact?: boolean;
  nativeShell?: boolean;
  showEndCall?: boolean;
  ending?: boolean;
  onEndCall?: () => void;
  onDeviceError?: (source: Track.Source, error: Error) => void;
};

export function VideoCallMediaControls({
  compact = false,
  nativeShell = false,
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

  const runMicToggle = useCallback(
    async (targetEnabled: boolean) => {
      if (pending) return;
      setPending("mic");
      try {
        if (targetEnabled) {
          await enableMicrophoneWithRetry(localParticipant);
        } else {
          await localParticipant.setMicrophoneEnabled(false);
        }
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error(t("micEnableFailed"));
        onDeviceError?.(Track.Source.Microphone, err);
      } finally {
        setPending(null);
      }
    },
    [localParticipant, onDeviceError, pending, t],
  );

  const runCameraToggle = useCallback(
    async (targetEnabled: boolean) => {
      if (pending) return;
      setPending("camera");
      try {
        if (targetEnabled) {
          const publication = localParticipant.getTrackPublication(
            Track.Source.Camera,
          );
          if (publication?.isMuted) {
            await publication.unmute();
          } else {
            await enableCameraWithRetry(localParticipant);
          }
        } else {
          await localParticipant.setCameraEnabled(false);
        }
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error(t("cameraEnableFailed"));
        onDeviceError?.(Track.Source.Camera, err);
      } finally {
        setPending(null);
      }
    },
    [localParticipant, onDeviceError, pending, t],
  );

  const buttonClass = compact
    ? "min-h-11 rounded-full px-3 py-2.5 text-xs font-semibold sm:text-sm"
    : "min-h-10 rounded-full px-4 py-2 text-sm font-semibold";

  const pressMic = useCallback(() => {
    kickMediaUserGesture(room, { audio: true, video: false });
    void runMicToggle(!isMicrophoneEnabled);
  }, [isMicrophoneEnabled, room, runMicToggle]);

  const pressCamera = useCallback(() => {
    const turningOn = !isCameraEnabled;
    kickMediaUserGesture(room, { audio: true, video: turningOn });
    void runCameraToggle(turningOn);
  }, [isCameraEnabled, room, runCameraToggle]);

  const micHandlers = nativeShell
    ? {
        onTouchStart: (event: TouchEvent<HTMLButtonElement>) => {
          event.preventDefault();
          pressMic();
        },
      }
    : {
        onPointerDown: () => {
          kickMediaUserGesture(room, { audio: true, video: false });
        },
        onClick: () => pressMic(),
      };

  const cameraHandlers = nativeShell
    ? {
        onTouchStart: (event: TouchEvent<HTMLButtonElement>) => {
          event.preventDefault();
          pressCamera();
        },
      }
    : {
        onPointerDown: () => {
          const turningOn = !isCameraEnabled;
          kickMediaUserGesture(room, { audio: true, video: turningOn });
        },
        onClick: () => pressCamera(),
      };

  return (
    <div
      className={`easymatch-media-controls flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-zinc-700 bg-zinc-900 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3${
        nativeShell ? " easymatch-media-controls--native-shell" : ""
      }`}
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
        {...micHandlers}
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
        {...cameraHandlers}
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
