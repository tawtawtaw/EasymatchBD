import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'stream';
import {
  LocalStorageBackend,
  resolveLocalUploadRoot,
} from './local-storage.backend';
import {
  resolveSupabaseSecretKey,
  SupabaseStorageBackend,
} from './supabase-storage.backend';
import type { StorageBackendKind, StorageCategory } from './storage.types';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private primary!: LocalStorageBackend | SupabaseStorageBackend;
  private localFallback: LocalStorageBackend | null = null;

  constructor(private readonly config: ConfigService) {
    const uploadRoot = resolveLocalUploadRoot(
      this.config.get<string>('UPLOAD_DIR'),
    );
    this.primary = new LocalStorageBackend(uploadRoot);
  }

  onModuleInit(): void {
    const requested = this.resolveRequestedBackend();
    const uploadRoot = resolveLocalUploadRoot(
      this.config.get<string>('UPLOAD_DIR'),
    );
    const local = new LocalStorageBackend(uploadRoot);

    if (requested !== 'supabase') {
      this.primary = local;
      this.logger.log(`Storage backend: local (${uploadRoot})`);
      return;
    }

    const url = this.config.get<string>('SUPABASE_URL')?.trim();
    const secretKey = resolveSupabaseSecretKey(
      this.config.get<string>('SUPABASE_SECRET_KEY'),
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
    const bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET')?.trim();
    const missing: string[] = [];
    if (!url) {
      missing.push('SUPABASE_URL');
    }
    if (!secretKey) {
      missing.push('SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
    }
    if (!bucket) {
      missing.push('SUPABASE_STORAGE_BUCKET');
    }

    if (missing.length > 0) {
      this.logger.error(
        `STORAGE_BACKEND=supabase but missing ${missing.join(', ')}. Falling back to local disk at ${uploadRoot}.`,
      );
      this.primary = local;
      return;
    }

    this.primary = new SupabaseStorageBackend({
      url: url!,
      secretKey: secretKey!,
      bucket: bucket!,
    });
    this.localFallback = local;
    this.logger.log(`Storage backend: supabase (bucket=${bucket})`);
  }

  async save(
    userId: string,
    category: StorageCategory,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    return await this.primary.save(userId, category, buffer, mimeType);
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

  private resolveRequestedBackend(): StorageBackendKind {
    const configured = this.config
      .get<string>('STORAGE_BACKEND')
      ?.trim()
      .toLowerCase();
    if (configured === 'supabase' || configured === 'local') {
      return configured;
    }
    return 'local';
  }
}
