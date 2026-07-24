export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_NID_BYTES = 5 * 1024 * 1024;
export const MAX_GALLERY_PHOTOS = 4;

export const ALLOWED_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_NID_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
