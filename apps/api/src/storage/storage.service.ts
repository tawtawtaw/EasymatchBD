import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'stream';
import {
  LocalStorageBackend,
  resolveLocalUploadRoot,
} from './local-storage.backend';
import { resolveStorageConfig } from './storage.config';
import { SupabaseStorageBackend } from './supabase-storage.backend';
import type { StorageCategory } from './storage.types';
import { derivedPhotoStorageKey } from './storage.utils';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private primary!: LocalStorageBackend | SupabaseStorageBackend;
  private localFallback: LocalStorageBackend | null = null;
  private activeBackend: 'local' | 'supabase' = 'local';

  constructor(private readonly config: ConfigService) {
    const uploadRoot = resolveLocalUploadRoot(
      this.config.get<string>('UPLOAD_DIR'),
    );
    this.primary = new LocalStorageBackend(uploadRoot);
  }

  onModuleInit(): void {
    const uploadRoot = resolveLocalUploadRoot(
      this.config.get<string>('UPLOAD_DIR'),
    );
    const local = new LocalStorageBackend(uploadRoot);
    const resolved = resolveStorageConfig(this.config);

    if (resolved.backend !== 'supabase') {
      this.primary = local;
      this.activeBackend = 'local';
      if (resolved.missingSupabase.length > 0) {
        const requested = this.config.get<string>('STORAGE_BACKEND')?.trim();
        if (requested?.toLowerCase() === 'supabase') {
          this.logger.error(
            `STORAGE_BACKEND=supabase but missing ${resolved.missingSupabase.join(', ')}. Using local disk at ${uploadRoot}.`,
          );
        }
      }
      this.logger.log(`Storage backend: local (${uploadRoot})`);
      return;
    }

    const url = this.config.get<string>('SUPABASE_URL')!.trim();
    const secretKey =
      this.config.get<string>('SUPABASE_SECRET_KEY')?.trim() ||
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!.trim();

    this.primary = new SupabaseStorageBackend({
      url,
      secretKey,
      bucket: resolved.bucket!,
    });
    this.localFallback = local;
    this.activeBackend = 'supabase';
    this.logger.log(`Storage backend: supabase (bucket=${resolved.bucket})`);
  }

  async save(
    userId: string,
    category: StorageCategory,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const storageKey = await this.primary.save(
      userId,
      category,
      buffer,
      mimeType,
    );
    this.logger.log(
      `Stored ${category} file via ${this.activeBackend}: ${storageKey}`,
    );
    return storageKey;
  }

  async saveAt(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    await this.primary.saveAt(storageKey, buffer, mimeType);
  }

  async readBuffer(storageKey: string): Promise<Buffer> {
    if (await this.primary.exists(storageKey)) {
      return await this.primary.readBuffer(storageKey);
    }
    if (this.localFallback && (await this.localFallback.exists(storageKey))) {
      return this.localFallback.readBuffer(storageKey);
    }
    return await this.primary.readBuffer(storageKey);
  }

  async delete(storageKey: string): Promise<void> {
    await this.primary.delete(storageKey);
  }

  async exists(storageKey: string): Promise<boolean> {
    if (await this.primary.exists(storageKey)) {
      return true;
    }
    return this.localFallback?.exists(storageKey) ?? false;
  }

  async createReadStream(storageKey: string): Promise<Readable> {
    if (await this.primary.exists(storageKey)) {
      return await this.primary.createReadStream(storageKey);
    }
    if (this.localFallback?.exists(storageKey)) {
      return this.localFallback.createReadStream(storageKey);
    }
    return await this.primary.createReadStream(storageKey);
  }

  async deleteDerivedPhotos(originalKey: string): Promise<void> {
    await Promise.allSettled([
      this.delete(derivedPhotoStorageKey(originalKey, 'thumb')),
      this.delete(derivedPhotoStorageKey(originalKey, 'display')),
    ]);
  }
}
