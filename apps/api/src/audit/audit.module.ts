import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { StaffAuditController } from './staff-audit.controller';
import { StaffAuditInterceptor } from './staff-audit.interceptor';
import { StaffAuditService } from './staff-audit.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [StaffAuditController],
  providers: [
    StaffAuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: StaffAuditInterceptor,
    },
  ],
  exports: [StaffAuditService],
})
export class AuditModule {}
