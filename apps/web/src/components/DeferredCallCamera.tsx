"use client";

import {
  useConnectionState,
  useLocalParticipant,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { useEffect, useRef } from "react";
import { enableCameraWithRetry } from "@/lib/video-call-media";

type DeferredCallCameraProps = {
  onDeviceError?: (source: Track.Source, error: Error) => void;
};

/**
 * Enables the camera after the room is connected and mic is up.
 * Avoids Chrome "Timeout starting video source" from parallel mic+camera capture.
 */
export function DeferredCallCamera({ onDeviceError }: DeferredCallCameraProps) {
  const connectionState = useConnectionState();
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    if (attemptedRef.current || isCameraEnabled) return;

    attemptedRef.current = true;
    const timer = window.setTimeout(() => {
      void enableCameraWithRetry(localParticipant).catch((error) => {
        onDeviceError?.(
          Track.Source.Camera,
          error instanceof Error ? error : new Error(String(error)),
        );
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [connectionState, isCameraEnabled, localParticipant, onDeviceError]);

  return null;
}
