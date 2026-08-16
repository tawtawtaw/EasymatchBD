"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { fetchAuthenticatedBlob } from "@/lib/media";

type AuthenticatedBlobImageProps = {
  token: string;
  path: string;
  alt: string;
  className?: string;
  fetchBlob?: (token: string, path: string) => Promise<Blob>;
  /** Deter casual save/right-click when viewing another member's photos. */
  protect?: boolean;
  watermarkLabel?: string;
};

export function AuthenticatedBlobImage({
  token,
  path,
  alt,
  className,
  fetchBlob = fetchAuthenticatedBlob,
  protect = false,
  watermarkLabel = "EasymatchBD",
}: AuthenticatedBlobImageProps) {
  const t = useTranslations("discovery");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    fetchBlob(token, path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, path, fetchBlob]);

  const pdfPlaceholder =
    className?.includes("biodata-pdf-photo") ||
    className?.includes("biodata-pdf-gallery-photo");

  if (!src) {
    if (pdfPlaceholder) {
      return (
        <div className={`biodata-pdf-photo biodata-pdf-photo-loading ${className ?? ""}`}>
          …
        </div>
      );
    }

    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 text-xs text-zinc-500 ${className ?? ""}`}
      >
        …
      </div>
    );
  }

  const layoutClassName = (className ?? "").replace(/\bobject-\S+/g, "").trim();
  const image = (
    <img
      src={src}
      alt={alt}
      className={`${className ?? ""} ${protect ? "pointer-events-none absolute inset-0 h-full w-full select-none" : ""}`}
      loading="lazy"
      draggable={false}
      onContextMenu={protect ? (event) => event.preventDefault() : undefined}
    />
  );

  if (!protect) {
    return image;
  }

  return (
    <div
      className={`relative overflow-hidden ${layoutClassName}`}
      onContextMenu={(event) => event.preventDefault()}
      role="img"
      aria-label={alt}
    >
      {image}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none bg-[repeating-linear-gradient(-24deg,transparent,transparent_48px,rgba(255,255,255,0.08)_48px,rgba(255,255,255,0.08)_96px)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex flex-wrap content-center justify-center gap-x-8 gap-y-12 overflow-hidden p-2 opacity-[0.18]"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            key={index}
            className="rotate-[-24deg] text-[10px] font-semibold uppercase tracking-wide text-white drop-shadow-sm sm:text-xs"
          >
            {watermarkLabel}
          </span>
        ))}
      </div>
      <span className="sr-only">{t("photoProtectedHint")}</span>
    </div>
  );
}
