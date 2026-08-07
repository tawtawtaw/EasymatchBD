"use client";

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

export function LiveKitAudioBootstrap() {
  const t = useTranslations("videoCalls");
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [needsTap, setNeedsTap] = useState(false);
  const initialMicBootstrapRef = useRef(false);

  const unlockRemoteAudio = useCallback(async () => {
    await room.startAudio();
  }, [room]);

  const enableCallAudio = useCallback(async () => {
    try {
      await unlockRemoteAudio();
      if (!initialMicBootstrapRef.current) {
        initialMicBootstrapRef.current = true;
        if (!localParticipant.isMicrophoneEnabled) {
          await localParticipant.setMicrophoneEnabled(true);
        }
      }
      setNeedsTap(false);
    } catch {
      setNeedsTap(true);
    }
  }, [localParticipant, unlockRemoteAudio]);

  useEffect(() => {
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
  }, [enableCallAudio, room]);

  if (!needsTap) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-2 z-20 flex justify-center px-3">
      <button
        type="button"
        onClick={() => void enableCallAudio()}
        className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg hover:bg-amber-400"
      >
        {t("tapToEnableSound")}
      </button>
    </div>
  );
}
