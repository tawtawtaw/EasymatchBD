"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AuthenticatedBlobImage } from "@/components/AuthenticatedBlobImage";
import { discoveryPhotoUrl, fetchDiscoveryBlob } from "@/lib/discovery";

type Props = {
  token: string;
  profileId: string;
  photoIds: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ProfilePhotoLightbox({
  token,
  profileId,
  photoIds,
  index,
  alt,
  onClose,
  onIndexChange,
}: Props) {
  const t = useTranslations("discovery");
  const photoId = photoIds[index];
  const total = photoIds.length;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index < total - 1) {
        onIndexChange(index + 1);
      }
      if (event.key === "ArrowLeft" && index > 0) {
        onIndexChange(index - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose, onIndexChange, total]);

  if (!photoId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95"
      role="dialog"
      aria-modal="true"
      aria-label={t("galleryTitle")}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm font-medium">
          {t("galleryCounter", { current: index + 1, total })}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
        >
          {t("galleryClose")}
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            className="absolute left-3 z-10 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            {t("galleryPrevious")}
          </button>
        ) : null}
        <div className="h-[min(80vh,720px)] w-[min(90vw,640px)]">
          <AuthenticatedBlobImage
            token={token}
            path={discoveryPhotoUrl(profileId, photoId, "display")}
            alt={alt}
            className="h-full w-full object-contain"
            protect
            fetchBlob={(authToken, path) => {
              const match = path.match(
                /\/discovery\/profiles\/([^/]+)\/photos\/([^/]+)\/file/,
              );
              if (!match) throw new Error("Invalid photo path");
              const variantMatch = path.match(/variant=(thumb|display|original)/);
              return fetchDiscoveryBlob(
                authToken,
                match[1],
                match[2],
                (variantMatch?.[1] as "thumb" | "display" | "original") ?? "display",
              );
            }}
          />
        </div>
        {index < total - 1 ? (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            className="absolute right-3 z-10 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            {t("galleryNext")}
          </button>
        ) : null}
      </div>
      <p className="px-4 pb-4 text-center text-xs text-zinc-400">
        {t("photoConfidentialNotice")}
      </p>
    </div>
  );
}
