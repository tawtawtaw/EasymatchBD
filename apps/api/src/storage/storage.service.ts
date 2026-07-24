import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly uploadRoot: string;

  constructor(private readonly config: ConfigService) {
    const configured = this.config.get<string>('UPLOAD_DIR');
    this.uploadRoot = configured
      ? join(process.cwd(), configured)
      : join(process.cwd(), 'uploads');
    if (!existsSync(this.uploadRoot)) {
      mkdirSync(this.uploadRoot, { recursive: true });
    }
  }

  save(
    userId: string,
    category: 'photos' | 'nid' | 'messages',
    buffer: Buffer,
    mimeType: string,
  ): string {
    const ext = this.extensionForMime(mimeType);
    const storageKey = join(userId, category, `${randomUUID()}${ext}`);
    const absolutePath = join(this.uploadRoot, storageKey);
    const dir = join(this.uploadRoot, userId, category);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(absolutePath, buffer);
    return storageKey.replace(/\\/g, '/');
  }

  delete(storageKey: string): void {
    const absolutePath = this.resolvePath(storageKey);
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }

  resolvePath(storageKey: string): string {
    const normalized = storageKey.replace(/\\/g, '/');
    if (normalized.includes('..')) {
      throw new Error('Invalid storage key');
    }
    return join(this.uploadRoot, normalized);
  }

  createReadStream(storageKey: string) {
    return createReadStream(this.resolvePath(storageKey));
  }

  exists(storageKey: string): boolean {
    return existsSync(this.resolvePath(storageKey));
  }

  private extensionForMime(mimeType: string): string {
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
}
