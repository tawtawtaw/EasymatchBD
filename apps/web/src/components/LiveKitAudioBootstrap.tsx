"use client";

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useCallback, useEffect } from "react";
import {
  isNativeVideoCallShell,
  notifyMobileVideoCallState,
} from "@/lib/mobile-video-call";

type Props = {
  nativeShell?: boolean;
};

/**
 * Web: unlock audio on connect.
 * Native shell: only report active; mic/camera must be enabled via in-page controls
 * (user gesture required for WebView getUserMedia).
 */
export function LiveKitAudioBootstrap({ nativeShell = false }: Props) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const inNativeShell = nativeShell || isNativeVideoCallShell();

  const enableCallAudio = useCallback(async () => {
    try {
      await room.startAudio();
      void room.startVideo().catch(() => undefined);
      if (!localParticipant.isMicrophoneEnabled) {
        await localParticipant.setMicrophoneEnabled(true);
      }
    } catch {
      /* ignore — user can retry from controls */
    }
  }, [localParticipant, room]);

  useEffect(() => {
    if (inNativeShell) {
      const onConnected = () => {
        notifyMobileVideoCallState("active");
        void room.startAudio().catch(() => undefined);
        void room.startVideo().catch(() => undefined);
      };
      if (room.state === "connected") {
        onConnected();
      }
      room.on(RoomEvent.Connected, onConnected);
      return () => {
        room.off(RoomEvent.Connected, onConnected);
      };
    }

    const onConnected = () => {
      void enableCallAudio();
    };

    if (room.state === "connected") {
      void enableCallAudio();
    }

    room.on(RoomEvent.Connected, onConnected);
    return () => {
      room.off(RoomEvent.Connected, onConnected);
    };
  }, [enableCallAudio, inNativeShell, room]);

  return null;
}
