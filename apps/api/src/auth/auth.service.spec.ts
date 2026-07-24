import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ProfilesService } from '../profiles/profiles.service';
import { StaffProfilesService } from '../profiles/staff-profiles.service';
import { LegalService } from '../legal/legal.service';
import { AuthService } from './auth.service';
import { RoleAssignmentService } from './role-assignment.service';
import { SMS_PROVIDER } from './sms/sms.provider';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const redis = {
    get: jest.fn(),
    getDel: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  };

  const jwt = {
    signAsync: jest.fn().mockResolvedValue('test-token'),
  };

  const sms = {
    sendOtp: jest.fn().mockResolvedValue(undefined),
  };

  const roleAssignment = {
    resolveRoleForPhone: jest.fn().mockReturnValue(undefined),
    syncUserRole: jest.fn().mockResolvedValue('individual'),
    syncRoleForLoadedUser: jest.fn().mockResolvedValue('individual'),
  };

  const profiles = {
    getCompletionSummary: jest.fn().mockResolvedValue({
      completionPercent: 0,
      completionMissing: [],
    }),
  };

  const staffProfiles = {
    getCompletionSummary: jest.fn().mockResolvedValue({
      completionPercent: 0,
      completionMissing: [],
    }),
  };

  const legalService = {
    getCurrentVersion: jest.fn().mockResolvedValue('1.0'),
  };

  const config = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const values: Record<string, unknown> = {
        OTP_TTL_SECONDS: 300,
        OTP_RATE_LIMIT: 3,
        OTP_RATE_WINDOW_SECONDS: 900,
        NODE_ENV: 'development',
      };
      return values[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    redis.incr.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: RoleAssignmentService, useValue: roleAssignment },
        { provide: ProfilesService, useValue: profiles },
        { provide: StaffProfilesService, useValue: staffProfiles },
        { provide: LegalService, useValue: legalService },
        { provide: SMS_PROVIDER, useValue: sms },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('rejects invalid phone numbers', async () => {
    await expect(service.sendOtp('12345')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('sends OTP for valid phone numbers', async () => {
    const result = await service.sendOtp('01712345678');

    expect(result.phone).toBe('+8801712345678');
    expect(redis.set).toHaveBeenCalled();
    expect(sms.sendOtp).toHaveBeenCalled();
    expect(result.devOtp).toHaveLength(6);
  });

  it('rejects invalid OTP codes', async () => {
    redis.getDel.mockResolvedValue('123456');

    await expect(
      service.verifyOtp('01712345678', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates a user on first successful verification', async () => {
    redis.getDel.mockResolvedValue('123456');
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      phone: '+8801712345678',
      email: null,
      role: 'individual',
      phoneVerifiedAt: new Date(),
      subscription: { plan: 'free', isActive: true },
    });

    const result = await service.verifyOtp('01712345678', '123456');

    expect(result.isNewUser).toBe(true);
    expect(result.accessToken).toBe('test-token');
    expect(prisma.user.create).toHaveBeenCalled();
  });
});
