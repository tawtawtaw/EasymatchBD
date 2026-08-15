import { randomUUID } from 'crypto';
import type { StorageCategory } from './storage.types';

export function normalizeStorageKey(storageKey: string): string {
  const normalized = storageKey.replace(/\\/g, '/');
  if (normalized.includes('..')) {
    throw new Error('Invalid storage key');
  }
  return normalized;
}

export function sniffImageMime(buffer: Buffer, reportedMime?: string): string | null {
  const reported = (reportedMime ?? '').toLowerCase().trim();
  if (reported === 'image/jpg' || reported === 'image/pjpeg') {
    return 'image/jpeg';
  }
  if (
    reported === 'image/jpeg' ||
    reported === 'image/png' ||
    reported === 'image/webp'
  ) {
    return reported;
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

export function buildStorageKey(
  userId: string,
  category: StorageCategory,
  mimeType: string,
): string {
  const ext = extensionForMime(mimeType);
  return `${userId}/${category}/${randomUUID()}${ext}`;
}

export function derivedPhotoStorageKey(
  originalKey: string,
  variant: 'thumb' | 'display',
): string {
  const normalized = normalizeStorageKey(originalKey);
  const slash = normalized.lastIndexOf('/');
  const name = slash === -1 ? normalized : normalized.slice(slash + 1);
  const dir = slash === -1 ? '' : normalized.slice(0, slash + 1);
  const base = name.replace(/\.[^.]+$/, '');
  return `${dir}${base}.${variant}.jpg`;
}
