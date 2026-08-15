import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import sharp from 'sharp';
import {
  PHOTO_VARIANT_MAX_EDGE,
  type PhotoVariant,
} from '@easymatch/shared';
import { StorageService } from './storage.service';
import { derivedPhotoStorageKey } from './storage.utils';

export type PhotoFilePayload = {
  stream: Readable;
  mimeType: string;
};

@Injectable()
export class PhotoVariantService {
  private readonly logger = new Logger(PhotoVariantService.name);
  private readonly inflight = new Map<string, Promise<PhotoFilePayload>>();

  constructor(private readonly storage: StorageService) {}

  async streamOriginalOrVariant(
    storageKey: string,
    originalMimeType: string,
    variant: PhotoVariant,
  ): Promise<PhotoFilePayload> {
    if (variant === 'original') {
      return {
        stream: await this.storage.createReadStream(storageKey),
        mimeType: originalMimeType,
      };
    }

    const cacheKey = `${storageKey}:${variant}`;
    const existing = this.inflight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const request = this.buildVariant(storageKey, originalMimeType, variant)
      .catch(async (error) => {
        this.logger.warn(
          `Falling back to original for ${storageKey} (${variant}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return {
          stream: await this.storage.createReadStream(storageKey),
          mimeType: originalMimeType,
        };
      })
      .finally(() => {
        this.inflight.delete(cacheKey);
      });

    this.inflight.set(cacheKey, request);
    return request;
  }

  private async buildVariant(
    storageKey: string,
    originalMimeType: string,
    variant: 'thumb' | 'display',
  ): Promise<PhotoFilePayload> {
    const variantKey = derivedPhotoStorageKey(storageKey, variant);
    if (await this.storage.exists(variantKey)) {
      return {
        stream: await this.storage.createReadStream(variantKey),
        mimeType: 'image/jpeg',
      };
    }

    if (!originalMimeType.startsWith('image/')) {
      return {
        stream: await this.storage.createReadStream(storageKey),
        mimeType: originalMimeType,
      };
    }

    const original = await this.storage.readBuffer(storageKey);
    const maxEdge = PHOTO_VARIANT_MAX_EDGE[variant];
    const resized = await sharp(original)
      .rotate()
      .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: variant === 'thumb' ? 72 : 82, mozjpeg: true })
      .toBuffer();

    await this.storage.saveAt(variantKey, resized, 'image/jpeg');
    return {
      stream: Readable.from(resized),
      mimeType: 'image/jpeg',
    };
  }
}
