"use client";

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { ParticipantEvent, RoomEvent } from "livekit-client";
import { useEffect, useRef } from "react";
import {
  enableCameraWithRetry,
  enableMicrophoneWithRetry,
  kickMediaUserGesture,
} from "@/lib/video-call-media";
import { notifyMobileVideoCallMediaState } from "@/lib/mobile-video-call";

declare global {
  interface Window {
    __easymatchNativeCallMedia?: {
      toggleMic: () => void;
      toggleCamera: () => void;
      enableCallMedia: () => void;
      enableMicrophone: () => void;
    };
    __easymatchNativeCommandQueue?: string[];
    __easymatchRunNativeCommand?: (cmd: string) => boolean;
  }
}

type Props = {
  nativeShell?: boolean;
  autoEnableMicrophone?: boolean;
};

const INCOMING_MIC_ENABLE_DELAY_MS = 350;

function drainNativeCommandQueue() {
  const queue = window.__easymatchNativeCommandQueue;
  if (!queue?.length || !window.__easymatchRunNativeCommand) return;
  while (queue.length > 0) {
    const cmd = queue.shift();
    if (cmd) window.__easymatchRunNativeCommand(cmd);
  }
}

export function NativeCallMediaBridge({
  nativeShell = false,
  autoEnableMicrophone = false,
}: Props) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const localParticipantRef = useRef(localParticipant);
  localParticipantRef.current = localParticipant;
  const micEnableInFlightRef = useRef(false);

  useEffect(() => {
    if (!nativeShell) return;

    const syncMediaState = () => {
      const lp = room.localParticipant;
      notifyMobileVideoCallMediaState(
        lp.isMicrophoneEnabled,
        lp.isCameraEnabled,
      );
    };

    const toggleMic = () => {
      kickMediaUserGesture(room, { audio: true, video: false });
      void (async () => {
        const lp = room.localParticipant;
        try {
          if (lp.isMicrophoneEnabled) {
            await lp.setMicrophoneEnabled(false);
          } else {
            await enableMicrophoneWithRetry(lp);
          }
        } catch {
          /* parent shows mediaError when needed */
        } finally {
          syncMediaState();
        }
      })();
    };

    const toggleCamera = () => {
      kickMediaUserGesture(room, { audio: true, video: true });
      void (async () => {
        const lp = room.localParticipant;
        try {
          if (lp.isCameraEnabled) {
            await lp.setCameraEnabled(false);
          } else {
            await enableCameraWithRetry(lp);
          }
        } catch {
          /* parent shows mediaError when needed */
        } finally {
          syncMediaState();
        }
      })();
    };

    const enableMicrophone = () => {
      kickMediaUserGesture(room, { audio: true, video: false });
      if (micEnableInFlightRef.current) return;
      void (async () => {
        const lp = room.localParticipant;
        if (lp.isMicrophoneEnabled) {
          syncMediaState();
          return;
        }
        micEnableInFlightRef.current = true;
        try {
          await room.startAudio();
          if (!lp.isMicrophoneEnabled) {
            await enableMicrophoneWithRetry(lp);
          }
        } catch {
          /* user can still tap the in-call mic control */
        } finally {
          micEnableInFlightRef.current = false;
          syncMediaState();
        }
      })();
    };

    const enableCallMedia = () => {
      kickMediaUserGesture(room, { audio: true, video: true });
      void (async () => {
        const lp = room.localParticipant;
        try {
          await room.startAudio();
          void room.startVideo().catch(() => undefined);
          if (!lp.isMicrophoneEnabled) {
            await enableMicrophoneWithRetry(lp);
          }
          if (!lp.isCameraEnabled) {
            await enableCameraWithRetry(lp);
          }
        } catch {
          /* banner may remain */
        } finally {
          syncMediaState();
        }
      })();
    };

    window.__easymatchNativeCallMedia = {
      toggleMic,
      toggleCamera,
      enableCallMedia,
      enableMicrophone,
    };

    window.__easymatchRunNativeCommand = (cmd: string) => {
      const api = window.__easymatchNativeCallMedia;
      if (!api) return false;
      if (cmd === "toggleMic") {
        api.toggleMic();
        return true;
      }
      if (cmd === "toggleCamera") {
        api.toggleCamera();
        return true;
      }
      if (cmd === "enableCallMedia") {
        api.enableCallMedia();
        return true;
      }
      if (cmd === "enableMicrophone") {
        api.enableMicrophone();
        return true;
      }
      return false;
    };

    drainNativeCommandQueue();
    syncMediaState();
    (
      window as Window & {
        ReactNativeWebView?: { postMessage: (message: string) => void };
      }
    ).ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "video_call", status: "bridge_ready" }),
    );

    let incomingMicTimer: number | undefined;
    const scheduleIncomingMicrophone = () => {
      if (!autoEnableMicrophone) return;
      window.clearTimeout(incomingMicTimer);
      incomingMicTimer = window.setTimeout(() => {
        enableMicrophone();
      }, INCOMING_MIC_ENABLE_DELAY_MS);
    };

    const onConnected = () => {
      syncMediaState();
      scheduleIncomingMicrophone();
    };
    const onLocalTrack = () => syncMediaState();

    if (room.state === "connected") {
      scheduleIncomingMicrophone();
    }

    room.on(RoomEvent.Connected, onConnected);
    localParticipant.on(ParticipantEvent.LocalTrackPublished, onLocalTrack);
    localParticipant.on(ParticipantEvent.LocalTrackUnpublished, onLocalTrack);
    localParticipant.on(ParticipantEvent.TrackMuted, onLocalTrack);
    localParticipant.on(ParticipantEvent.TrackUnmuted, onLocalTrack);

    return () => {
      window.clearTimeout(incomingMicTimer);
      room.off(RoomEvent.Connected, onConnected);
      localParticipant.off(ParticipantEvent.LocalTrackPublished, onLocalTrack);
      localParticipant.off(ParticipantEvent.LocalTrackUnpublished, onLocalTrack);
      localParticipant.off(ParticipantEvent.TrackMuted, onLocalTrack);
      localParticipant.off(ParticipantEvent.TrackUnmuted, onLocalTrack);
      delete window.__easymatchNativeCallMedia;
      delete window.__easymatchRunNativeCommand;
    };
  }, [autoEnableMicrophone, localParticipant, nativeShell, room]);

  return null;
}
