import type { PhotoVariant } from '@easymatch/shared';

/**
 * Private browser/CDN caching for authenticated photo streams.
 * Variants are derived once and reusable; originals stay shorter-lived.
 */
export function photoCacheControl(variant: PhotoVariant): string {
  if (variant === 'original') {
    return 'private, max-age=120';
  }
  return 'private, max-age=86400';
}

export const NID_FILE_CACHE_CONTROL = 'private, max-age=60';
