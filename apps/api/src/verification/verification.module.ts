import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LegalModule } from '../legal/legal.module';
import { PushNotificationModule } from '../push/push-notification.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { StaffAssistedService } from './staff-assisted.service';
import { VerificationAlertsService } from './verification-alerts.service';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    LegalModule,
    PushNotificationModule,
    PrivacyModule,
    forwardRef(() => ProfilesModule),
  ],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VerificationAlertsService,
    StaffAssistedService,
  ],
  exports: [VerificationAlertsService, VerificationService, StaffAssistedService],
})
export class VerificationModule {}
