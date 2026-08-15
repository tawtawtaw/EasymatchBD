export const PHOTO_VARIANTS = ["original", "thumb", "display"] as const;

export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

export const PHOTO_VARIANT_MAX_EDGE = {
  thumb: 400,
  display: 1440,
} as const;

export function isPhotoVariant(
  value: string | null | undefined,
): value is PhotoVariant {
  return value === "original" || value === "thumb" || value === "display";
}

export function parsePhotoVariant(
  value: string | null | undefined,
): PhotoVariant {
  return isPhotoVariant(value) ? value : "original";
}

export function withPhotoVariant(url: string, variant: PhotoVariant): string {
  if (variant === "original") {
    return url;
  }
  const hashIndex = url.indexOf("#");
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}variant=${variant}${hash}`;
}

export function visibleProfilePhotoIds(media: {
  primaryPhotoId?: string | null;
  galleryPhotoIds?: string[] | null;
}): string[] {
  const ids: string[] = [];
  if (media.primaryPhotoId) {
    ids.push(media.primaryPhotoId);
  }
  for (const id of media.galleryPhotoIds ?? []) {
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}
