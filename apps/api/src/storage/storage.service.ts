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
  private readonly backendKind: StorageBackendKind;
  private readonly primary: LocalStorageBackend | SupabaseStorageBackend;
  private readonly localFallback: LocalStorageBackend | null;

  constructor(private readonly config: ConfigService) {
    this.backendKind = this.resolveBackendKind();
    const uploadRoot = resolveLocalUploadRoot(
      this.config.get<string>('UPLOAD_DIR'),
    );

    if (this.backendKind === 'supabase') {
      const url = this.config.get<string>('SUPABASE_URL')?.trim();
      const secretKey = resolveSupabaseSecretKey(
        this.config.get<string>('SUPABASE_SECRET_KEY'),
        this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
      );
      const bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET')?.trim();
      if (!url || !secretKey || !bucket) {
        throw new Error(
          'STORAGE_BACKEND=supabase requires SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY), and SUPABASE_STORAGE_BUCKET',
        );
      }
      this.primary = new SupabaseStorageBackend({ url, secretKey, bucket });
      this.localFallback = new LocalStorageBackend(uploadRoot);
    } else {
      this.primary = new LocalStorageBackend(uploadRoot);
      this.localFallback = null;
    }
  }

  onModuleInit(): void {
    if (this.backendKind === 'supabase') {
      const bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET')?.trim();
      this.logger.log(`Storage backend: supabase (bucket=${bucket})`);
      return;
    }
    const uploadRoot = resolveLocalUploadRoot(
      this.config.get<string>('UPLOAD_DIR'),
    );
    this.logger.log(`Storage backend: local (${uploadRoot})`);
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

  private resolveBackendKind(): StorageBackendKind {
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
