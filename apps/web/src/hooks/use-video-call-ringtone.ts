"use client";

import { useEffect, useRef } from "react";
import {
  startVideoCallRingtone,
  stopVideoCallRingtone,
  unlockVideoCallRingtone,
  type VideoCallRingtoneKind,
} from "@/lib/video-call-ringtone";

let unlockListenerAttached = false;

function attachUnlockListener() {
  if (unlockListenerAttached || typeof window === "undefined") return;
  unlockListenerAttached = true;

  const unlock = () => {
    unlockVideoCallRingtone();
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

export function useVideoCallRingtone(
  active: boolean,
  kind: VideoCallRingtoneKind | null,
) {
  const kindRef = useRef(kind);

  useEffect(() => {
    kindRef.current = kind;
  }, [kind]);

  useEffect(() => {
    attachUnlockListener();
  }, []);

  useEffect(() => {
    if (!active || !kind) {
      stopVideoCallRingtone();
      return;
    }

    startVideoCallRingtone(kind);
    return () => {
      if (kindRef.current === kind) {
        stopVideoCallRingtone();
      }
    };
  }, [active, kind]);
}
