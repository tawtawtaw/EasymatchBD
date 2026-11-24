import { Controller, Get, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { AppReleaseService } from './app-release.service';

@Controller('public/app')
export class PublicAppReleaseController {
  constructor(private readonly releases: AppReleaseService) {}

  @Get('latest')
  getLatest() {
    return this.releases.getPublicLatest();
  }

  /** Tiny JSON for web to redirect without proxying APK bytes. */
  @Get('android-download')
  getAndroidDownload() {
    return this.releases.resolveCurrentDownloadTarget();
  }

  @Get('android.apk')
  async downloadAndroid(
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | void> {
    const resolved = await this.releases.resolveCurrentDownload();
    if (resolved.mode === 'redirect') {
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.redirect(302, resolved.url);
      return;
    }

    const filename = `EasymatchBD-${resolved.current.versionName}.apk`;
    res.setHeader('Cache-Control', 'private, max-age=300');
    return new StreamableFile(resolved.stream, {
      type: 'application/vnd.android.package-archive',
      disposition: `attachment; filename="${filename}"`,
      length: resolved.current.fileSizeBytes,
    });
  }
}
