import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { AdminAppReleaseController } from './admin-app-release.controller';
import { AppReleaseService } from './app-release.service';
import { PublicAppReleaseController } from './public-app-release.controller';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [PublicAppReleaseController, AdminAppReleaseController],
  providers: [AppReleaseService],
  exports: [AppReleaseService],
})
export class AppReleaseModule {}
