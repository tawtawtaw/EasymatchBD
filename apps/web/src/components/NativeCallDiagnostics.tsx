"use client";

import {
  useRoomContext,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type Snapshot = {
  roomState: string;
  roomName: string;
  participantCount: number;
  localIdentity: string;
  mic: boolean;
  cam: boolean;
  publications: string[];
  remotes: string[];
  cameraTracks: string[];
  videos: string[];
  boxes: string[];
};

/** Container heights vs viewport — shows which element overflows the WebView. */
const MEASURED: Array<[string, string]> = [
  ["shell", ".easymatch-mobile-call-shell"],
  ["room", ".lk-room-container"],
  ["conf", ".easymatch-native-conference"],
  ["stage", ".easymatch-video-call-stage"],
  ["layout", ".easymatch-adaptive-layout"],
  ["stack", ".easymatch-gallery-stack"],
  ["tile", ".easymatch-video-tile"],
  ["controls", ".easymatch-media-controls"],
];

function measureBoxes(): string[] {
  const win = Math.round(window.innerHeight);
  const rows: string[] = [];
  const overflowing: string[] = [];

  for (const [label, selector] of MEASURED) {
    const elements = Array.from(document.querySelectorAll(selector));
    if (elements.length === 0) {
      rows.push(`${label} = missing`);
      continue;
    }
    elements.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const height = Math.round(rect.height);
      const top = Math.round(rect.top);
      const name = elements.length > 1 ? `${label}#${i}` : label;
      rows.push(`${name} = ${height} @${top}`);
      if (height > win + 2 || top + height > win + 2) {
        overflowing.push(`${name}(${height}@${top})`);
      }
    });
  }

  return [
    `win = ${win}`,
    `OVER: ${overflowing.join(" ") || "none"}`,
    ...rows,
  ];
}

function describeTrack(kind: string, sid: string, muted: boolean, live?: string) {
  return `${kind} ${sid.slice(-4)} ${muted ? "muted" : "live"}${live ? ` ${live}` : ""}`;
}

function readSnapshot(
  room: ReturnType<typeof useRoomContext>,
  rawTracks: TrackReferenceOrPlaceholder[],
): Snapshot {
  const lp = room.localParticipant;

  const publications = Array.from(lp.trackPublications.values()).map((pub) =>
    describeTrack(
      String(pub.source),
      pub.trackSid,
      pub.isMuted,
      pub.track?.mediaStreamTrack?.readyState,
    ),
  );

  const remotes = Array.from(room.remoteParticipants.values()).map(
    (participant) => {
      const pubs = Array.from(participant.trackPublications.values()).map(
        (pub) =>
          `${String(pub.source)}:${pub.isSubscribed ? "sub" : "unsub"}${
            pub.isMuted ? "/muted" : ""
          }${pub.track ? "/track" : "/notrack"}`,
      );
      return `${participant.identity} [${pubs.join(" ") || "no pubs"}]`;
    },
  );

  const cameraTracks = rawTracks.map(
    (ref) =>
      `${ref.participant?.identity ?? "NO-IDENTITY"}/${String(ref.source)}${
        ref.publication ? "" : "/placeholder"
      }`,
  );

  const videos = Array.from(document.querySelectorAll("video")).map((el, i) => {
    const rect = el.getBoundingClientRect();
    return `v${i} ${el.videoWidth}x${el.videoHeight} box ${Math.round(
      rect.width,
    )}x${Math.round(rect.height)} ${el.paused ? "paused" : "playing"} ${
      el.srcObject ? "src" : "nosrc"
    }`;
  });

  return {
    roomState: String(room.state),
    roomName: room.name,
    participantCount: room.numParticipants,
    localIdentity: lp.identity,
    mic: lp.isMicrophoneEnabled,
    cam: lp.isCameraEnabled,
    publications,
    remotes,
    cameraTracks,
    videos,
    boxes: measureBoxes(),
  };
}

/** On-screen + postMessage call diagnostics for web and the in-app WebView. Enabled with ?debug=1. */
export function NativeCallDiagnostics() {
  const room = useRoomContext();
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const tracksRef = useRef(rawTracks);
  tracksRef.current = rawTracks;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (!window.location.search.includes("debug=1")) return;

    const tick = () => {
      const next = readSnapshot(room, tracksRef.current);
      setSnapshot(next);
      (
        window as Window & {
          ReactNativeWebView?: { postMessage: (message: string) => void };
        }
      ).ReactNativeWebView?.postMessage(
        JSON.stringify({ type: "video_call_debug", snapshot: next }),
      );
    };

    tick();
    const timer = window.setInterval(tick, 2000);
    return () => window.clearInterval(timer);
  }, [room]);

  if (!snapshot) return null;

  return (
    <div
      onClick={() => setCollapsed((prev) => !prev)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.78)",
        color: "#a7f3d0",
        font: "10px/1.35 monospace",
        padding: "4px 6px",
        maxHeight: collapsed ? 16 : "85vh",
        overflow: collapsed ? "hidden" : "auto",
        whiteSpace: "pre-wrap",
      }}
    >
      {collapsed
        ? `dbg ${snapshot.roomState} mic:${snapshot.mic ? 1 : 0} cam:${
            snapshot.cam ? 1 : 0
          }`
        : [
            `state=${snapshot.roomState} n=${snapshot.participantCount}`,
            `room=${snapshot.roomName}`,
            `me=${snapshot.localIdentity}`,
            `mic=${snapshot.mic} cam=${snapshot.cam}`,
            `local: ${snapshot.publications.join(" | ") || "none"}`,
            `remote: ${snapshot.remotes.join(" | ") || "none"}`,
            `camTracks(${snapshot.cameraTracks.length}): ${
              snapshot.cameraTracks.join(" | ") || "none"
            }`,
            `videos(${snapshot.videos.length}): ${
              snapshot.videos.join(" | ") || "none"
            }`,
            ...snapshot.boxes,
          ].join("\n")}
    </div>
  );
}
