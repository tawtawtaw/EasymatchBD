"use client";

import {
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import "@/app/video-call-room.css";
import { DisconnectReason, Track } from "livekit-client";
import { DeferredCallCamera } from "@/components/DeferredCallCamera";
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

function VideoGrid({ embeddedMobile }: { embeddedMobile?: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const pairGrid = !embeddedMobile && tracks.length >= 2;

  return (
    <GridLayout
      tracks={tracks}
      className={pairGrid ? "easymatch-pair-grid h-full" : "h-full"}
    >
      <ParticipantTile />
    </GridLayout>
  );
}

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
            : "easymatch-video-call-stage--web"
        }`}
      >
        <VideoGrid embeddedMobile={embeddedMobile} />
      </div>
      <VideoCallMediaControls
        compact={embeddedMobile}
        showEndCall={showEndCall && !nativeShell}
        ending={ending}
        onEndCall={onEndCall}
        onDeviceError={onMediaDeviceError}
      />
      <DeferredCallCamera onDeviceError={onMediaDeviceError} />
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
        onDisconnected={onDisconnected}
        onError={(error) => {
          onMediaDeviceError?.(Track.Source.Camera, error);
        }}
        options={{
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: VIDEO_CALL_CAPTURE,
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
