import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { readFileSync } from 'fs';
import {
  ANDROID_APK_PUBLIC_PATH,
  isValidAndroidVersionName,
  parseAndroidVersionCode,
  type AdminAndroidAppRelease,
  type AdminAndroidAppReleaseStatus,
  type PublicAndroidAppRelease,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const APK_MIME = 'application/vnd.android.package-archive';
const KEEP_RELEASE_FILES = 3;

@Injectable()
export class AppReleaseService {
  private readonly logger = new Logger(AppReleaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getPublicLatest(): Promise<PublicAndroidAppRelease> {
    const current = await this.findCurrent();
    if (!current) {
      return {
        available: false,
        versionCode: null,
        versionName: null,
        fileSizeBytes: null,
        publishedAt: null,
        apkPath: ANDROID_APK_PUBLIC_PATH,
      };
    }

    return {
      available: true,
      versionCode: current.versionCode,
      versionName: current.versionName,
      fileSizeBytes: current.fileSizeBytes,
      publishedAt: current.publishedAt.toISOString(),
      apkPath: ANDROID_APK_PUBLIC_PATH,
    };
  }

  async getAdminStatus(): Promise<AdminAndroidAppReleaseStatus> {
    const history = await this.prisma.androidAppRelease.findMany({
      orderBy: { versionCode: 'desc' },
      take: 12,
    });
    const current = history.find((row) => row.isCurrent) ?? history[0] ?? null;
    const maxCode = history[0]?.versionCode ?? 0;
    return {
      current: current ? this.toAdmin(current) : null,
      nextVersionCode: maxCode + 1,
      history: history.map((row) => this.toAdmin(row)),
    };
  }

  async publish(options: {
    versionCode: unknown;
    versionName: string;
    file: Express.Multer.File;
    publishedById: string;
  }): Promise<AdminAndroidAppReleaseStatus> {
    const versionCode = parseAndroidVersionCode(options.versionCode);
    if (versionCode == null) {
      throw new BadRequestException('Version code must be a whole number starting at 1');
    }
    if (!isValidAndroidVersionName(options.versionName)) {
      throw new BadRequestException(
        'Version name should look like 0.2.0 and stay under 32 characters',
      );
    }

    const latest = await this.prisma.androidAppRelease.findFirst({
      orderBy: { versionCode: 'desc' },
      select: { versionCode: true },
    });
    if (latest && versionCode <= latest.versionCode) {
      throw new BadRequestException(
        `Version code must be higher than ${latest.versionCode}`,
      );
    }

    this.assertApkFile(options.file);

    const storageKey = `app-releases/android/${versionCode}.apk`;
    const buffer = options.file.path
      ? readFileSync(options.file.path)
      : options.file.buffer;
    if (!buffer?.length) {
      throw new BadRequestException('The APK file is empty');
    }
    this.assertZipMagic(buffer);

    await this.storage.saveAt(storageKey, buffer, APK_MIME);
    if (options.file.path) {
      await unlink(options.file.path).catch(() => undefined);
    }

    await this.prisma.$transaction([
      this.prisma.androidAppRelease.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      }),
      this.prisma.androidAppRelease.create({
        data: {
          versionCode,
          versionName: options.versionName.trim(),
          storageKey,
          fileName: options.file.originalname || `EasymatchBD-${versionCode}.apk`,
          fileSizeBytes: buffer.length,
          mimeType: APK_MIME,
          isCurrent: true,
          publishedById: options.publishedById,
        },
      }),
    ]);

    void this.pruneOldFiles();
    this.logger.log(`Published Android app ${options.versionName.trim()} (${versionCode})`);
    return this.getAdminStatus();
  }

  async getCurrentFile() {
    const current = await this.findCurrent();
    if (!current) {
      throw new NotFoundException('No Android app has been published yet');
    }
    if (!(await this.storage.exists(current.storageKey))) {
      throw new NotFoundException('The published APK file is missing');
    }
    return current;
  }

  async openCurrentStream() {
    const current = await this.getCurrentFile();
    const stream = await this.storage.createReadStream(current.storageKey);
    return { current, stream };
  }

  private async findCurrent() {
    return this.prisma.androidAppRelease.findFirst({
      where: { isCurrent: true },
      orderBy: { versionCode: 'desc' },
    });
  }

  private toAdmin(row: {
    id: string;
    versionCode: number;
    versionName: string;
    fileName: string;
    fileSizeBytes: number;
    isCurrent: boolean;
    publishedAt: Date;
  }): AdminAndroidAppRelease {
    return {
      id: row.id,
      versionCode: row.versionCode,
      versionName: row.versionName,
      fileName: row.fileName,
      fileSizeBytes: row.fileSizeBytes,
      isCurrent: row.isCurrent,
      publishedAt: row.publishedAt.toISOString(),
    };
  }

  private assertApkFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Choose an APK file to upload');
    }
    const name = (file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    const allowedMime =
      mime === APK_MIME ||
      mime === 'application/octet-stream' ||
      mime === 'application/zip' ||
      mime === '';
    if (!name.endsWith('.apk') && !allowedMime) {
      throw new BadRequestException('Upload a .apk file');
    }
    if (!name.endsWith('.apk')) {
      throw new BadRequestException('The file name must end with .apk');
    }
  }

  private assertZipMagic(buffer: Buffer) {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      throw new BadRequestException('That file does not look like a valid APK');
    }
  }

  private async pruneOldFiles() {
    try {
      const rows = await this.prisma.androidAppRelease.findMany({
        orderBy: { versionCode: 'desc' },
        select: { id: true, storageKey: true },
      });
      const extra = rows.slice(KEEP_RELEASE_FILES);
      for (const row of extra) {
        await this.storage.delete(row.storageKey).catch(() => undefined);
        await this.prisma.androidAppRelease.delete({ where: { id: row.id } });
      }
    } catch (error) {
      this.logger.warn(
        `Could not prune old APK files: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
