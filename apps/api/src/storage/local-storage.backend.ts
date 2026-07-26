import {
  createReadStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { isAbsolute, join } from 'path';
import { buildStorageKey, normalizeStorageKey } from './storage.utils';
import type { StorageBackend, StorageCategory } from './storage.types';

export class LocalStorageBackend implements StorageBackend {
  readonly kind = 'local' as const;

  constructor(private readonly uploadRoot: string) {
    if (!existsSync(this.uploadRoot)) {
      mkdirSync(this.uploadRoot, { recursive: true });
    }
  }

  save(
    userId: string,
    category: StorageCategory,
    buffer: Buffer,
    mimeType: string,
  ): string {
    const storageKey = buildStorageKey(userId, category, mimeType);
    const absolutePath = this.resolvePath(storageKey);
    const dir = join(this.uploadRoot, userId, category);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(absolutePath, buffer);
    return storageKey;
  }

  delete(storageKey: string): void {
    const absolutePath = this.resolvePath(storageKey);
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }

  exists(storageKey: string): boolean {
    return existsSync(this.resolvePath(storageKey));
  }

  createReadStream(storageKey: string) {
    return createReadStream(this.resolvePath(storageKey));
  }

  resolvePath(storageKey: string): string {
    return join(this.uploadRoot, normalizeStorageKey(storageKey));
  }
}

export function resolveLocalUploadRoot(configured?: string | null): string {
  const trimmed = configured?.trim();
  if (!trimmed) {
    return join(process.cwd(), 'uploads');
  }
  return isAbsolute(trimmed) ? trimmed : join(process.cwd(), trimmed);
}
