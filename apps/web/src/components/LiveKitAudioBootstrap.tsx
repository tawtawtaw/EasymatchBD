"use client";

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isNativeVideoCallShell,
  notifyMobileVideoCallState,
  notifyMobileVideoCallMediaState,
} from "@/lib/mobile-video-call";

type Props = {
  nativeShell?: boolean;
};

export function LiveKitAudioBootstrap({ nativeShell = false }: Props) {
  const t = useTranslations("videoCalls");
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const inNativeShell = nativeShell || isNativeVideoCallShell();
  const [needsTap, setNeedsTap] = useState(inNativeShell);
  const initialMicBootstrapRef = useRef(false);

  const unlockRemoteAudio = useCallback(async () => {
    await room.startAudio();
  }, [room]);

  const enableCallAudio = useCallback(async () => {
    try {
      await unlockRemoteAudio();
      void room.startVideo().catch(() => undefined);
      if (!initialMicBootstrapRef.current) {
        initialMicBootstrapRef.current = true;
        if (!localParticipant.isMicrophoneEnabled) {
          await localParticipant.setMicrophoneEnabled(true);
        }
      }
      setNeedsTap(false);
      if (inNativeShell) {
        notifyMobileVideoCallState("active");
        notifyMobileVideoCallMediaState(
          localParticipant.isMicrophoneEnabled,
          localParticipant.isCameraEnabled,
        );
      }
    } catch {
      setNeedsTap(true);
      if (inNativeShell) {
        notifyMobileVideoCallState("needs_media_tap");
      }
    }
  }, [inNativeShell, localParticipant, unlockRemoteAudio]);

  useEffect(() => {
    if (inNativeShell) {
      const onConnected = () => {
        notifyMobileVideoCallState("needs_media_tap");
      };
      if (room.state === "connected") {
        notifyMobileVideoCallState("needs_media_tap");
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

  if (!needsTap) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-2 z-20 flex justify-center px-3">
      <button
        id="easymatch-native-media-start"
        type="button"
        data-native-media-start="1"
        onClick={() => void enableCallAudio()}
        className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg hover:bg-amber-400"
      >
        {t("tapToEnableSound")}
      </button>
    </div>
  );
}
