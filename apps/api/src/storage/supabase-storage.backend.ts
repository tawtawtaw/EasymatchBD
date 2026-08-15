import type { SupabaseClient } from '@supabase/supabase-js';
import { Readable } from 'stream';
import { createSupabaseServerClient } from './supabase-client';
import { buildStorageKey, normalizeStorageKey } from './storage.utils';
import type { StorageBackend, StorageCategory } from './storage.types';

export type SupabaseStorageConfig = {
  url: string;
  secretKey: string;
  bucket: string;
};

export class SupabaseStorageBackend implements StorageBackend {
  readonly kind = 'supabase' as const;
  private readonly client: SupabaseClient;

  constructor(private readonly config: SupabaseStorageConfig) {
    this.client = createSupabaseServerClient(config.url, config.secretKey);
  }

  async save(
    userId: string,
    category: StorageCategory,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const storageKey = buildStorageKey(userId, category, mimeType);
    const { error } = await this.client.storage
      .from(this.config.bucket)
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: false,
      });
    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
    return storageKey;
  }

  async saveAt(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    const normalized = normalizeStorageKey(storageKey);
    const { error } = await this.client.storage
      .from(this.config.bucket)
      .upload(normalized, buffer, {
        contentType: mimeType,
        upsert: true,
      });
    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
  }

  async readBuffer(storageKey: string): Promise<Buffer> {
    const normalized = normalizeStorageKey(storageKey);
    const { data, error } = await this.client.storage
      .from(this.config.bucket)
      .download(normalized);
    if (error || !data) {
      throw new Error(
        error?.message ?? `Supabase download failed for ${normalized}`,
      );
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(storageKey: string): Promise<void> {
    const normalized = normalizeStorageKey(storageKey);
    const { error } = await this.client.storage
      .from(this.config.bucket)
      .remove([normalized]);
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    const normalized = normalizeStorageKey(storageKey);
    const { folder, name } = splitStorageKey(normalized);
    const { data, error } = await this.client.storage
      .from(this.config.bucket)
      .list(folder, {
        limit: 1,
        search: name,
      });
    if (error) {
      return false;
    }
    return (data ?? []).some((entry) => entry.name === name);
  }

  async createReadStream(storageKey: string): Promise<Readable> {
    const normalized = normalizeStorageKey(storageKey);
    const { data, error } = await this.client.storage
      .from(this.config.bucket)
      .download(normalized);
    if (error || !data) {
      throw new Error(
        error?.message ?? `Supabase download failed for ${normalized}`,
      );
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    return Readable.from(buffer);
  }
}

function splitStorageKey(storageKey: string): { folder: string; name: string } {
  const idx = storageKey.lastIndexOf('/');
  if (idx === -1) {
    return { folder: '', name: storageKey };
  }
  return {
    folder: storageKey.slice(0, idx),
    name: storageKey.slice(idx + 1),
  };
}

export function resolveSupabaseSecretKey(
  secretKey?: string | null,
  serviceRoleKey?: string | null,
): string | null {
  const secret = secretKey?.trim();
  if (secret) {
    return secret;
  }
  const legacy = serviceRoleKey?.trim();
  return legacy || null;
}
