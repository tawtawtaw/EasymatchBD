import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DropdownsModule } from '../dropdowns/dropdowns.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { LegalModule } from '../legal/legal.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RoleAssignmentService } from './role-assignment.service';
import { AuthUserCacheService } from './auth-user-cache.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConsoleSmsProvider } from './sms/console-sms.provider';
import { SMS_PROVIDER } from './sms/sms.provider';

@Module({
  imports: [
    forwardRef(() => ProfilesModule),
    LegalModule,
    DropdownsModule,
    DiscoveryModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            `${config.get<number>('TRUSTED_DEVICE_DAYS', 30)}d`) as `${number}d`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthUserCacheService,
    RoleAssignmentService,
    JwtStrategy,
    {
      provide: SMS_PROVIDER,
      useClass: ConsoleSmsProvider,
    },
  ],
  exports: [AuthService, AuthUserCacheService, JwtModule],
})
export class AuthModule {}
