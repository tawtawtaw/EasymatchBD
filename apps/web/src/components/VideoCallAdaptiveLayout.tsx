"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ParticipantTile,
  useParticipants,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { isNativeVideoCallShell } from "@/lib/mobile-video-call";

export type VideoCallLayoutMode = "speaker" | "gallery" | "compact";

type VideoCallAdaptiveLayoutProps = {
  embeddedMobile?: boolean;
  nativeShell?: boolean;
};

function trackKey(track: TrackReferenceOrPlaceholder): string {
  if (track.participant?.identity) {
    return `${track.participant.identity}-${track.source}`;
  }
  return track.publication?.trackSid ?? "track";
}

function participantIdentity(track: TrackReferenceOrPlaceholder): string {
  return track.participant?.identity ?? trackKey(track);
}

function trackHasVideo(track: TrackReferenceOrPlaceholder): boolean {
  return Boolean(track.publication && !track.publication.isMuted);
}

/** One camera tile per participant; prefer subscribed video over empty placeholders. */
function dedupeCameraTracks(
  tracks: TrackReferenceOrPlaceholder[],
): TrackReferenceOrPlaceholder[] {
  const byParticipant = new Map<string, TrackReferenceOrPlaceholder>();
  for (const track of tracks) {
    if (track.source !== Track.Source.Camera) continue;
    const id = participantIdentity(track);
    const existing = byParticipant.get(id);
    if (!existing) {
      byParticipant.set(id, track);
      continue;
    }
    if (!trackHasVideo(existing) && trackHasVideo(track)) {
      byParticipant.set(id, track);
    }
  }
  return Array.from(byParticipant.values());
}

function VideoTile({
  trackRef,
  className,
  highlighted,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  className?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`easymatch-video-tile overflow-hidden rounded-xl bg-zinc-800 ${
        highlighted ? "ring-2 ring-emerald-400" : "ring-1 ring-zinc-700"
      } ${className ?? ""}`}
    >
      <ParticipantTile trackRef={trackRef} className="h-full w-full" />
    </div>
  );
}

export function VideoCallAdaptiveLayout({
  embeddedMobile = false,
  nativeShell = false,
}: VideoCallAdaptiveLayoutProps) {
  const t = useTranslations("videoCalls.layout");
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const tracks = useMemo(
    () => dedupeCameraTracks(rawTracks),
    [rawTracks],
  );
  const participants = useParticipants();
  const participantCount = embeddedMobile
    ? tracks.length
    : Math.max(participants.length, tracks.length);
  const [mode, setMode] = useState<VideoCallLayoutMode>(
    participantCount >= 3 ? "speaker" : "gallery",
  );

  const effectiveMode =
    embeddedMobile || participantCount <= 2 ? "gallery" : mode;

  const dominantTrack = useMemo(() => {
    const speaking = participants
      .filter((participant) => participant.isSpeaking)
      .sort(
        (a, b) =>
          (b.audioLevel ?? 0) - (a.audioLevel ?? 0) ||
          a.identity.localeCompare(b.identity),
      );
    const dominantParticipant = speaking[0] ?? participants[0];
    if (!dominantParticipant) {
      return tracks[0] ?? null;
    }
    return (
      tracks.find(
        (track) =>
          track.participant?.identity === dominantParticipant.identity &&
          track.source === Track.Source.Camera,
      ) ??
      tracks.find(
        (track) => track.participant?.identity === dominantParticipant.identity,
      ) ??
      tracks[0] ??
      null
    );
  }, [participants, tracks]);

  const stripTracks = useMemo(() => {
    if (!dominantTrack) return tracks;
    const dominantKey = trackKey(dominantTrack);
    return tracks.filter((track) => trackKey(track) !== dominantKey);
  }, [dominantTrack, tracks]);

  const showLayoutToggle = participantCount >= 3 && !embeddedMobile;
  const useNativeStack =
    embeddedMobile && (nativeShell || isNativeVideoCallShell());

  const orderedTracks = useMemo(() => {
    const base = useNativeStack
      ? [...tracks].sort((a, b) => {
          const aLocal = a.participant?.isLocal ? 1 : 0;
          const bLocal = b.participant?.isLocal ? 1 : 0;
          return aLocal - bLocal;
        })
      : tracks;
    if (useNativeStack) {
      return base.slice(0, 2);
    }
    return base;
  }, [tracks, useNativeStack]);

  return (
    <div
      className={`easymatch-adaptive-layout flex h-full min-h-0 flex-col ${
        participantCount >= 3 ? "easymatch-adaptive-layout--group" : ""
      }`}
    >
      {showLayoutToggle ? (
        <div className="mb-2 flex flex-wrap gap-2 px-1">
          {(["speaker", "gallery", "compact"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                effectiveMode === option
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              }`}
            >
              {t(option)}
            </button>
          ))}
        </div>
      ) : null}

      {effectiveMode === "speaker" && participantCount >= 3 ? (
        <div className="easymatch-speaker-layout flex min-h-0 flex-1 flex-col gap-2">
          <div className="easymatch-speaker-main min-h-0 flex-1">
            {dominantTrack ? (
              <VideoTile trackRef={dominantTrack} className="h-full" highlighted />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl bg-zinc-800 text-sm text-zinc-400">
                {t("waitingForVideo")}
              </div>
            )}
          </div>
          {stripTracks.length > 0 ? (
            <div className="easymatch-speaker-strip flex shrink-0 gap-2 overflow-x-auto pb-1">
              {stripTracks.map((trackRef) => (
                <VideoTile
                  key={trackKey(trackRef)}
                  trackRef={trackRef}
                  className="h-20 w-28 shrink-0 sm:h-24 sm:w-32"
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={
            useNativeStack
              ? "easymatch-gallery-stack h-full min-h-0"
              : effectiveMode === "compact"
                ? "easymatch-gallery-grid easymatch-gallery-grid--compact h-full min-h-0"
                : `easymatch-gallery-grid h-full min-h-0${
                    embeddedMobile && participantCount <= 2
                      ? " easymatch-gallery-grid--pair"
                      : ""
                  }`
          }
        >
          {orderedTracks.map((trackRef) => (
            <VideoTile
              key={trackKey(trackRef)}
              trackRef={trackRef}
              className={
                useNativeStack
                  ? "easymatch-video-tile--stack min-h-0 flex-1"
                  : embeddedMobile && participantCount <= 2
                    ? "easymatch-video-tile--embedded-pair min-h-0"
                    : participantCount <= 2
                      ? "min-h-[160px] sm:min-h-[200px]"
                      : effectiveMode === "compact"
                        ? "min-h-[100px]"
                        : "min-h-[120px] sm:min-h-[140px]"
              }
              highlighted={
                dominantTrack != null &&
                trackKey(trackRef) === trackKey(dominantTrack) &&
                participants.some((p) => p.isSpeaking)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
