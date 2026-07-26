import { randomUUID } from 'crypto';
import type { StorageCategory } from './storage.types';

export function normalizeStorageKey(storageKey: string): string {
  const normalized = storageKey.replace(/\\/g, '/');
  if (normalized.includes('..')) {
    throw new Error('Invalid storage key');
  }
  return normalized;
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
