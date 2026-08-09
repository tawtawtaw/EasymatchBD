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
import { NativeCallMediaBridge } from "@/components/NativeCallMediaBridge";
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
  onConnected?: () => void;
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
  const stage = (
    <div
      className={`easymatch-video-call-stage overflow-hidden ${
        embeddedMobile
          ? `easymatch-video-call-stage--embedded${
              nativeShell ? " easymatch-video-call-stage--native-shell min-h-0 flex-1" : ""
            }`
          : "easymatch-video-call-stage--web easymatch-video-call-stage--adaptive"
      }`}
    >
      <VideoCallAdaptiveLayout
        embeddedMobile={embeddedMobile}
        nativeShell={nativeShell}
      />
    </div>
  );

  const controls = nativeShell ? null : (
    <VideoCallMediaControls
      compact={embeddedMobile}
      nativeShell={nativeShell}
      showEndCall={showEndCall && !nativeShell}
      ending={ending}
      onEndCall={onEndCall}
      onDeviceError={onMediaDeviceError}
    />
  );

  const extras = (
    <>
      {!nativeShell ? (
        <DeferredCallCamera onDeviceError={onMediaDeviceError} />
      ) : null}
      <LiveKitAudioBootstrap nativeShell={nativeShell} />
      {nativeShell ? <NativeCallMediaBridge nativeShell /> : null}
      <RoomAudioRenderer />
    </>
  );

  if (nativeShell) {
    return (
      <div className="easymatch-native-conference flex min-h-0 flex-1 flex-col">
        {stage}
        {controls}
        {extras}
      </div>
    );
  }

  return (
    <>
      {stage}
      {controls}
      {extras}
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
  onConnected,
  onDisconnected,
  onMediaDeviceError,
}: LiveKitVideoCallRoomProps) {
  const roomOptions = nativeShell
    ? {
        adaptiveStream: false,
        dynacast: false,
        disconnectOnPageLeave: false,
        videoCaptureDefaults: VIDEO_CALL_CAPTURE,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      }
    : {
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: VIDEO_CALL_CAPTURE,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      };

  return (
    <div
      className={`easymatch-video-call-room ${
        embeddedMobile
          ? `easymatch-video-call-room--embedded bg-zinc-950${
              nativeShell
                ? " easymatch-video-call-room--native-shell flex min-h-0 flex-1 flex-col"
                : " shrink-0"
            }`
          : "easymatch-video-call-room--web bg-zinc-950"
      }`}
    >
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        audio={!nativeShell}
        video={false}
        options={roomOptions}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        onError={
          nativeShell
            ? undefined
            : (error) => {
                onMediaDeviceError?.(Track.Source.Camera, error);
              }
        }
        data-lk-theme="default"
        className={
          nativeShell
            ? "flex h-full min-h-0 flex-1 flex-col"
            : "flex flex-col"
        }
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
