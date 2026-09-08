import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'stream';
import {
  LocalStorageBackend,
  resolveLocalUploadRoot,
} from './local-storage.backend';
import { resolveStorageConfig } from './storage.config';
import { SupabaseStorageBackend } from './supabase-storage.backend';
import { APP_RELEASE_STORAGE_PREFIX } from './storage.constants';
import type { StorageCategory } from './storage.types';
import { derivedPhotoStorageKey } from './storage.utils';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private primary!: LocalStorageBackend | SupabaseStorageBackend;
  private appRelease!: LocalStorageBackend | SupabaseStorageBackend;
  private localFallback: LocalStorageBackend | null = null;
  private activeBackend: 'local' | 'supabase' = 'local';

  constructor(private readonly config: ConfigService) {
    const uploadRoot = resolveLocalUploadRoot(
      this.config.get<string>('UPLOAD_DIR'),
    );
    this.primary = new LocalStorageBackend(uploadRoot);
    this.appRelease = this.primary;
  }

  onModuleInit(): void {
    const uploadRoot = resolveLocalUploadRoot(
      this.config.get<string>('UPLOAD_DIR'),
    );
    const local = new LocalStorageBackend(uploadRoot);
    const resolved = resolveStorageConfig(this.config);

    if (resolved.backend !== 'supabase') {
      this.primary = local;
      this.appRelease = local;
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
    const appReleaseBucket =
      this.config.get<string>('SUPABASE_APP_RELEASE_BUCKET')?.trim() || null;
    if (appReleaseBucket && appReleaseBucket !== resolved.bucket) {
      this.appRelease = new SupabaseStorageBackend({
        url,
        secretKey,
        bucket: appReleaseBucket,
      });
      this.logger.log(
        `Storage backend: supabase (bucket=${resolved.bucket}, app-releases=${appReleaseBucket})`,
      );
    } else {
      this.appRelease = this.primary;
      this.logger.warn(
        'SUPABASE_APP_RELEASE_BUCKET is unset. APK uploads use the photo bucket and will fail the 5 MB / image MIME limits. Create a private app-releases bucket (200 MB) and set the variable.',
      );
      this.logger.log(`Storage backend: supabase (bucket=${resolved.bucket})`);
    }
    this.localFallback = local;
    this.activeBackend = 'supabase';
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
    await this.storeFor(storageKey).saveAt(storageKey, buffer, mimeType);
  }

  async readBuffer(storageKey: string): Promise<Buffer> {
    const store = this.storeFor(storageKey);
    if (await store.exists(storageKey)) {
      return await store.readBuffer(storageKey);
    }
    if (this.localFallback && (await this.localFallback.exists(storageKey))) {
      return this.localFallback.readBuffer(storageKey);
    }
    return await store.readBuffer(storageKey);
  }

  async delete(storageKey: string): Promise<void> {
    await this.storeFor(storageKey).delete(storageKey);
  }

  async deleteUserFiles(userId: string): Promise<void> {
    this.logger.log(`Deleting all stored files for user ${userId}`);
    await this.primary.deletePrefix(userId);
    if (this.localFallback) {
      await this.localFallback.deletePrefix(userId);
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    if (await this.storeFor(storageKey).exists(storageKey)) {
      return true;
    }
    return this.localFallback?.exists(storageKey) ?? false;
  }

  async createReadStream(storageKey: string): Promise<Readable> {
    const store = this.storeFor(storageKey);
    if (await store.exists(storageKey)) {
      return await store.createReadStream(storageKey);
    }
    if (this.localFallback?.exists(storageKey)) {
      return this.localFallback.createReadStream(storageKey);
    }
    return await store.createReadStream(storageKey);
  }

  private storeFor(storageKey: string) {
    return storageKey.startsWith(APP_RELEASE_STORAGE_PREFIX)
      ? this.appRelease
      : this.primary;
  }

  async deleteDerivedPhotos(originalKey: string): Promise<void> {
    await Promise.allSettled([
      this.delete(derivedPhotoStorageKey(originalKey, 'thumb')),
      this.delete(derivedPhotoStorageKey(originalKey, 'display')),
    ]);
  }
}
