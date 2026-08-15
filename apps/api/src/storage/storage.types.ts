import type { Readable } from 'stream';

export type StorageCategory = 'photos' | 'nid' | 'messages';
export type StorageBackendKind = 'local' | 'supabase';

export interface StorageBackend {
  readonly kind: StorageBackendKind;
  save(
    userId: string,
    category: StorageCategory,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> | string;
  saveAt(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> | void;
  readBuffer(storageKey: string): Promise<Buffer> | Buffer;
  delete(storageKey: string): Promise<void> | void;
  exists(storageKey: string): Promise<boolean> | boolean;
  createReadStream(storageKey: string): Promise<Readable> | Readable;
}
