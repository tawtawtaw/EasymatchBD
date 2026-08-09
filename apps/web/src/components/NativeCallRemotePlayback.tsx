"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import { useEffect } from "react";
import { isNativeVideoCallShell } from "@/lib/mobile-video-call";

type Props = {
  nativeShell?: boolean;
};

export function NativeCallRemotePlayback({ nativeShell = false }: Props) {
  const room = useRoomContext();

  useEffect(() => {
    const inNative = nativeShell || isNativeVideoCallShell();
    if (!inNative) return;

    const unlockPlayback = () => {
      void room.startAudio().catch(() => undefined);
      void room.startVideo().catch(() => undefined);
    };

    const onConnected = () => unlockPlayback();
    const onTrackSubscribed = (track: { kind: Track.Kind }) => {
      if (
        track.kind === Track.Kind.Video ||
        track.kind === Track.Kind.Audio
      ) {
        unlockPlayback();
      }
    };

    if (room.state === "connected") {
      unlockPlayback();
    }

    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    return () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
    };
  }, [nativeShell, room]);

  return null;
}
