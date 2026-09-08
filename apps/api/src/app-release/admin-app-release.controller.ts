import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@easymatch/shared';
import { diskStorage } from 'multer';
import { tmpdir } from 'os';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MAX_APK_BYTES } from '../storage/storage.constants';
import { AppReleaseService } from './app-release.service';

@Controller('admin/app-release')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminAppReleaseController {
  constructor(private readonly releases: AppReleaseService) {}

  @Get()
  getStatus() {
    return this.releases.getAdminStatus();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, file, callback) => {
          callback(null, `easymatch-apk-${randomUUID()}${extname(file.originalname || '.apk')}`);
        },
      }),
      limits: { fileSize: MAX_APK_BYTES },
    }),
  )
  publish(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { versionCode?: string; versionName?: string },
  ) {
    return this.releases.publish({
      versionCode: body.versionCode,
      versionName: body.versionName ?? '',
      file,
      publishedById: user.id,
    });
  }
}
