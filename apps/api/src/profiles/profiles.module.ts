import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DropdownsModule } from '../dropdowns/dropdowns.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { VerificationModule } from '../verification/verification.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { ProfilePauseService } from './profile-pause.service';
import { StaffProfilesService } from './staff-profiles.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    DropdownsModule,
    PrivacyModule,
    forwardRef(() => VerificationModule),
  ],
  controllers: [ProfilesController, MediaController],
  providers: [ProfilesService, StaffProfilesService, MediaService, ProfilePauseService],
  exports: [ProfilesService, StaffProfilesService, MediaService, ProfilePauseService],
})
export class ProfilesModule {}
