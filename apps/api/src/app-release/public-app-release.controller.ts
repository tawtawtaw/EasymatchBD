import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import { AppReleaseService } from './app-release.service';

@Controller('public/app')
export class PublicAppReleaseController {
  constructor(private readonly releases: AppReleaseService) {}

  @Get('latest')
  getLatest() {
    return this.releases.getPublicLatest();
  }

  @Get('android.apk')
  @Header('Cache-Control', 'no-store')
  async downloadAndroid(): Promise<StreamableFile> {
    const { current, stream } = await this.releases.openCurrentStream();
    const filename = `EasymatchBD-${current.versionName}.apk`;
    return new StreamableFile(stream, {
      type: 'application/vnd.android.package-archive',
      disposition: `attachment; filename="${filename}"`,
      length: current.fileSizeBytes,
    });
  }
}
