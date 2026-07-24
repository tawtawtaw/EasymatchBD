import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { StaffAlertsService } from './staff-alerts.service';
import { StaffController } from './staff.controller';
import { StaffNotificationService } from './staff-notification.service';

@Global()
@Module({
  controllers: [StaffController],
  providers: [EmailService, StaffAlertsService, StaffNotificationService],
  exports: [StaffAlertsService, StaffNotificationService, EmailService],
})
export class StaffModule {}
