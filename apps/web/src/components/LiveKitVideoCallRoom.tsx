"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import "@/app/video-call-room.css";
import { DisconnectReason, Track } from "livekit-client";
import { DeferredCallCamera } from "@/components/DeferredCallCamera";
import { VideoCallAdaptiveLayout } from "@/components/VideoCallAdaptiveLayout";
import { LiveKitAudioBootstrap } from "@/components/LiveKitAudioBootstrap";
import { VideoCallMediaControls } from "@/components/VideoCallMediaControls";
import { VIDEO_CALL_CAPTURE } from "@/lib/video-call-media";

type LiveKitVideoCallRoomProps = {
  serverUrl: string;
  token: string;
  embeddedMobile?: boolean;
  nativeShell?: boolean;
  showEndCall?: boolean;
  ending?: boolean;
  onEndCall?: () => void;
  onDisconnected?: (reason?: DisconnectReason) => void;
  onMediaDeviceError?: (source: Track.Source, error: Error) => void;
};

function ConferenceLayout({
  embeddedMobile,
  nativeShell,
  showEndCall,
  ending,
  onEndCall,
  onMediaDeviceError,
}: {
  embeddedMobile?: boolean;
  nativeShell?: boolean;
  showEndCall?: boolean;
  ending?: boolean;
  onEndCall?: () => void;
  onMediaDeviceError?: (source: Track.Source, error: Error) => void;
}) {
  return (
    <>
      <div
        className={`easymatch-video-call-stage overflow-hidden ${
          embeddedMobile
            ? "easymatch-video-call-stage--embedded"
            : "easymatch-video-call-stage--web easymatch-video-call-stage--adaptive"
        }`}
      >
        <VideoCallAdaptiveLayout embeddedMobile={embeddedMobile} />
      </div>
      <VideoCallMediaControls
        compact={embeddedMobile}
        showEndCall={showEndCall && !nativeShell}
        ending={ending}
        onEndCall={onEndCall}
        onDeviceError={onMediaDeviceError}
      />
      <DeferredCallCamera onDeviceError={onMediaDeviceError} />
      <LiveKitAudioBootstrap />
      <RoomAudioRenderer />
    </>
  );
}

export function LiveKitVideoCallRoom({
  serverUrl,
  token,
  embeddedMobile = false,
  nativeShell = false,
  showEndCall = false,
  ending = false,
  onEndCall,
  onDisconnected,
  onMediaDeviceError,
}: LiveKitVideoCallRoomProps) {
  return (
    <div
      className={`easymatch-video-call-room ${
        embeddedMobile
          ? "easymatch-video-call-room--embedded shrink-0 bg-zinc-950"
          : "easymatch-video-call-room--web bg-zinc-950"
      }`}
    >
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        audio
        video={false}
        options={{
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: VIDEO_CALL_CAPTURE,
          audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },
        }}
        onDisconnected={onDisconnected}
        onError={(error) => {
          onMediaDeviceError?.(Track.Source.Camera, error);
        }}
        data-lk-theme="default"
        className="flex flex-col"
      >
        <ConferenceLayout
          embeddedMobile={embeddedMobile}
          nativeShell={nativeShell}
          showEndCall={showEndCall}
          ending={ending}
          onEndCall={onEndCall}
          onMediaDeviceError={onMediaDeviceError}
        />
      </LiveKitRoom>
    </div>
  );
}
