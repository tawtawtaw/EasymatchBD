export type MarketingVideoSource =
  | { kind: "youtube"; videoId: string }
  | { kind: "vimeo"; videoId: string }
  | { kind: "mp4"; src: string };

export type MarketingVideo = {
  id: string;
  /** Translation key under publicHome.videos.items.{titleKey} */
  titleKey: string;
  /** Optional key under publicHome.videos.items.{descriptionKey} */
  descriptionKey?: string;
  source: MarketingVideoSource;
  featured?: boolean;
};

/**
 * Platform marketing / product explainers (not member profile videos).
 *
 * YouTube: use the video ID from the URL (e.g. dQw4w9WgXcQ).
 * Vimeo: use the numeric ID from vimeo.com/123456789.
 * MP4: place files in apps/web/public/videos/ and use src "/videos/your-file.mp4".
 */
export const MARKETING_VIDEOS: MarketingVideo[] = [
  {
    id: "how-it-works",
    titleKey: "howItWorks",
    descriptionKey: "howItWorks",
    featured: true,
    source: { kind: "mp4", src: "/videos/how-it-works.mp4" },
  },
  {
    id: "privacy-explained",
    titleKey: "privacyExplained",
    descriptionKey: "privacyExplained",
    source: { kind: "mp4", src: "/videos/privacy-explained.mp4" },
  },
];

export function getFeaturedMarketingVideo() {
  return MARKETING_VIDEOS.find((video) => video.featured) ?? MARKETING_VIDEOS[0] ?? null;
}
