import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { LegalModule } from './legal/legal.module';
import { MarketingModule } from './marketing/marketing.module';
import { AdminModule } from './admin/admin.module';
import { VerificationModule } from './verification/verification.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ConsultantModule } from './consultant/consultant.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { PushNotificationModule } from './push/push-notification.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', '.env.local'),
        join(__dirname, '..', '.env'),
        join(process.cwd(), 'apps', 'api', '.env.local'),
        join(process.cwd(), 'apps', 'api', '.env'),
        '.env.local',
        '.env',
      ],
    }),
    PrismaModule,
    RedisModule,
    PushNotificationModule,
    StaffModule,
    StorageModule,
    AuditModule,
    AuthModule,
    ProfilesModule,
    VerificationModule,
    AdminModule,
    DiscoveryModule,
    SubscriptionsModule,
    ConsultantModule,
    ComplaintsModule,
    LegalModule,
    MarketingModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
