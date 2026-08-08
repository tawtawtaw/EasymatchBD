"use client";

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { useCallback, useEffect } from "react";
import {
  enableCameraWithRetry,
  enableMicrophoneWithRetry,
  kickMediaUserGesture,
} from "@/lib/video-call-media";

declare global {
  interface Window {
    __easymatchNativeCallMedia?: {
      toggleMic: () => void;
      toggleCamera: () => void;
    };
  }
}

type Props = {
  nativeShell?: boolean;
};

export function NativeCallMediaBridge({ nativeShell = false }: Props) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();

  const toggleMic = useCallback(() => {
    kickMediaUserGesture(room, { audio: true, video: false });
    void (async () => {
      try {
        if (isMicrophoneEnabled) {
          await localParticipant.setMicrophoneEnabled(false);
        } else {
          await enableMicrophoneWithRetry(localParticipant);
        }
      } catch {
        /* errors shown in call UI when toggling from web controls */
      }
    })();
  }, [isMicrophoneEnabled, localParticipant, room]);

  const toggleCamera = useCallback(() => {
    const turningOn = !isCameraEnabled;
    kickMediaUserGesture(room, { audio: true, video: turningOn });
    void (async () => {
      try {
        if (turningOn) {
          await enableCameraWithRetry(localParticipant);
        } else {
          await localParticipant.setCameraEnabled(false);
        }
      } catch {
        /* errors shown in call UI when toggling from web controls */
      }
    })();
  }, [isCameraEnabled, localParticipant, room]);

  useEffect(() => {
    if (!nativeShell) return;
    window.__easymatchNativeCallMedia = { toggleMic, toggleCamera };
    return () => {
      delete window.__easymatchNativeCallMedia;
    };
  }, [nativeShell, toggleCamera, toggleMic]);

  return null;
}
