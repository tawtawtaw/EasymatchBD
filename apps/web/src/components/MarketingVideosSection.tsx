"use client";

import { useState } from "react";
import type { MarketingVideoSource } from "@/content/marketing-videos";

export type MarketingVideoDisplay = {
  id: string;
  title: string;
  description?: string;
  source: MarketingVideoSource;
  featured?: boolean;
};

type MarketingVideoPlayerProps = {
  source: MarketingVideoSource;
  title: string;
};

function embedUrl(source: MarketingVideoSource) {
  switch (source.kind) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.videoId)}?rel=0&modestbranding=1`;
    case "vimeo":
      return `https://player.vimeo.com/video/${encodeURIComponent(source.videoId)}?title=0&byline=0`;
    default:
      return null;
  }
}

export function MarketingVideoPlayer({
  source,
  title,
}: MarketingVideoPlayerProps) {
  const [loaded, setLoaded] = useState(source.kind === "mp4");

  if (source.kind === "mp4") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-lg">
        <video
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
          aria-label={title}
        >
          <source src={source.src} type="video/mp4" />
        </video>
      </div>
    );
  }

  const url = embedUrl(source);
  if (!url) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-lg">
      {!loaded ? (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-rose-900 to-amber-900 text-white"
          aria-label={title}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl">
            ▶
          </span>
          <span className="px-4 text-center text-sm font-semibold">{title}</span>
        </button>
      ) : (
        <iframe
          src={url}
          title={title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </div>
  );
}

type MarketingVideosSectionProps = {
  videos: MarketingVideoDisplay[];
  title: string;
  subtitle: string;
  featuredLabel: string;
};

export function MarketingVideosSection({
  videos,
  title,
  subtitle,
  featuredLabel,
}: MarketingVideosSectionProps) {
  if (videos.length === 0) return null;

  return (
    <section className="border-y border-rose-100 bg-gradient-to-b from-white to-rose-50/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-zinc-900">{title}</h2>
          <p className="mt-3 text-zinc-600">{subtitle}</p>
        </div>

        <div
          className={`mt-10 grid gap-8 ${
            videos.length === 1
              ? "mx-auto max-w-3xl"
              : "md:grid-cols-2"
          }`}
        >
          {videos.map((video) => (
            <article
              key={video.id}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
            >
              {video.featured ? (
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rose-700">
                  {featuredLabel}
                </p>
              ) : null}
              <MarketingVideoPlayer source={video.source} title={video.title} />
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                {video.title}
              </h3>
              {video.description ? (
                <p className="mt-2 text-sm text-zinc-600">{video.description}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
