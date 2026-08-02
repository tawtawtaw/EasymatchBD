import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  hasAcceptedCurrentTerms,
  isPaidMember,
  isStaffRole,
  isSuperAdminRole,
  isValidBangladeshPhone,
  isValidEmail,
  isVerificationOfficerRole,
  normalizeBangladeshPhone,
  normalizeEmail,
  UserRole,
} from '@easymatch/shared';
import { hashPassword, verifyPassword } from './password.util';
import { createHash, randomBytes } from 'crypto';
import { DropdownsService } from '../dropdowns/dropdowns.service';
import { MediaService } from '../profiles/media.service';
import { ProfilesService } from '../profiles/profiles.service';
import { StaffProfilesService } from '../profiles/staff-profiles.service';
import { LegalService } from '../legal/legal.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RoleAssignmentService } from './role-assignment.service';
import { SubscriptionAccessService } from '../subscriptions/subscription-access.service';
import { hasVerificationRejections } from '../verification/verification-status';
import type { ProfileVerificationPayload } from '../verification/verification-status';
import { SMS_PROVIDER } from './sms/sms.provider';
import type { SmsProvider } from './sms/sms.provider';
import type { AuthOtpPurpose } from './dto/send-otp.dto';
import type { AuthUser } from './decorators/current-user.decorator';
import { AuthUserCacheService } from './auth-user-cache.service';
import { MemberCacheWarmupService } from '../discovery/member-cache-warmup.service';
import { PushNotificationService } from '../push/push-notification.service';

const OTP_KEY_PREFIX = 'otp:';
const OTP_RATE_KEY_PREFIX = 'otp:rate:';

function readEnv(config: ConfigService, key: string): string {
  return (config.get<string>(key) ?? process.env[key] ?? '').trim();
}

function isTruthyEnv(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function isExplicitlyFalseEnv(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'false' || normalized === '0' || normalized === 'no';
}
const DEVICE_KEY_PREFIX = 'auth:device:';
const SESSION_CACHE_TTL_MS = 60_000;
const SESSION_STALE_TTL_MS = 180_000;

const memberProfileRedirectSelect = {
  isVerified: true,
  isPaused: true,
  pausedAt: true,
  profileBiodataReviewStatus: true,
  creationMode: true,
  nidVerifiedAt: true,
  creatorNidVerifiedAt: true,
  photos: { select: { type: true, status: true } },
  nidDocuments: { select: { side: true, status: true, subject: true } },
} as const;

const verifyOtpUserInclude = {
  subscription: { select: { plan: true, isActive: true, endsAt: true } },
  profile: { select: memberProfileRedirectSelect },
} as const;

const EDITOR_BOOTSTRAP_CACHE_TTL_MS = 60_000;
const EDITOR_BOOTSTRAP_STALE_TTL_MS = 180_000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpTtlSeconds: number;
  private readonly otpRateLimit: number;
  private readonly otpRateWindowSeconds: number;
  private readonly trustedDeviceDays: number;
  private readonly isDev: boolean;
  private readonly exposeOtpInResponse: boolean;
  private readonly sessionCache = new Map<
    string,
    {
      expiresAt: number;
      value: Awaited<ReturnType<AuthService['buildSessionForUser']>>;
    }
  >();
  private readonly editorBootstrapCache = new Map<
    string,
    {
      expiresAt: number;
      value: {
        role: string;
        profileKind: 'member' | 'staff';
        termsAccepted: boolean;
        termsVersion: string | null;
        currentTermsVersion: string;
        termsDeclinedAt: string | null;
        creationMode?: string | null;
        onBehalfRelation?: string | null;
        profile: unknown;
        dropdowns: unknown;
        verificationFeedback: unknown;
        completionPercent?: number;
        completionMissing?: string[];
      };
    }
  >();
  private static readonly FULL_PROFILE_CACHE_TTL_MS = 30_000;
  private readonly fullProfileCache = new Map<
    string,
    { expiresAt: number; value: Record<string, unknown> }
  >();
  private readonly fullProfileInflight = new Map<
    string,
    Promise<Record<string, unknown>>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly roleAssignment: RoleAssignmentService,
    private readonly profiles: ProfilesService,
    private readonly staffProfiles: StaffProfilesService,
    private readonly legalService: LegalService,
    private readonly dropdownsService: DropdownsService,
    private readonly mediaService: MediaService,
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly authUserCache: AuthUserCacheService,
    private readonly memberCacheWarmup: MemberCacheWarmupService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    private readonly pushNotifications: PushNotificationService,
  ) {
    this.otpTtlSeconds = this.config.get<number>('OTP_TTL_SECONDS', 300);
    this.otpRateLimit = this.config.get<number>('OTP_RATE_LIMIT', 3);
    this.otpRateWindowSeconds = this.config.get<number>(
      'OTP_RATE_WINDOW_SECONDS',
      900,
    );
    this.trustedDeviceDays = this.config.get<number>('TRUSTED_DEVICE_DAYS', 30);
    this.isDev = this.config.get<string>('NODE_ENV', 'development') !== 'production';

    const exposeOtpSetting = readEnv(this.config, 'EXPOSE_OTP_IN_RESPONSE');
    const smsProvider = readEnv(this.config, 'SMS_PROVIDER').toLowerCase() || 'console';
    const usesConsoleSms = smsProvider === 'console';

    this.exposeOtpInResponse =
      !isExplicitlyFalseEnv(exposeOtpSetting) &&
      (this.isDev || isTruthyEnv(exposeOtpSetting) || usesConsoleSms);

    if (this.exposeOtpInResponse && !this.isDev) {
      this.logger.warn(
        usesConsoleSms
          ? 'Console SMS provider active — OTP codes are included in API responses until a real SMS provider is configured. Set EXPOSE_OTP_IN_RESPONSE=false to hide.'
          : 'EXPOSE_OTP_IN_RESPONSE is enabled — OTP codes are included in API responses. Remove before public launch.',
      );
    }
  }

  async sendOtp(rawPhone: string, purpose: AuthOtpPurpose = 'member') {
    if (!isValidBangladeshPhone(rawPhone)) {
      throw new BadRequestException(
        'Enter a valid Bangladesh mobile number (e.g. 01712345678)',
      );
    }

    const phone = normalizeBangladeshPhone(rawPhone);
    const staffAllowlisted = this.roleAssignment.isAllowlistedStaffPhone(phone);

    if (purpose === 'staff' && !staffAllowlisted) {
      throw new UnauthorizedException(
        'This mobile number is not authorized for staff sign-in',
      );
    }

    if (purpose === 'member' && staffAllowlisted) {
      throw new UnauthorizedException(
        'Please use the Staff tab to sign in with this number',
      );
    }

    await this.enforceRateLimit(phone);

    const code = this.generateOtp();
    await this.redis.set(`${OTP_KEY_PREFIX}${phone}`, code, this.otpTtlSeconds);
    await this.sms.sendOtp(phone, code);

    const response: Record<string, unknown> = {
      message: 'OTP sent successfully',
      phone,
      expiresInSeconds: this.otpTtlSeconds,
    };

    if (this.exposeOtpInResponse) {
      response.devOtp = code;
    }

    return response;
  }

  async verifyOtp(
    rawPhone: string,
    code: string,
    purpose: AuthOtpPurpose = 'member',
    rememberDevice = true,
  ) {
    if (!isValidBangladeshPhone(rawPhone)) {
      throw new BadRequestException('Invalid phone number');
    }

    const phone = normalizeBangladeshPhone(rawPhone);
    const staffAllowlisted = this.roleAssignment.isAllowlistedStaffPhone(phone);

    if (purpose === 'staff' && !staffAllowlisted) {
      throw new UnauthorizedException(
        'This mobile number is not authorized for staff sign-in',
      );
    }

    if (purpose === 'member' && staffAllowlisted) {
      throw new UnauthorizedException(
        'Please use the Staff tab to sign in with this number',
      );
    }

    const storedCode = await this.redis.getDel(`${OTP_KEY_PREFIX}${phone}`);

    if (!storedCode || storedCode !== code) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const now = new Date();
    const assignedRole = this.roleAssignment.resolveRoleForPhone(phone);

    const existing = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    const isNewUser = !existing;

    const user = await this.prisma.user.upsert({
      where: { phone },
      create: {
        phone,
        phoneVerifiedAt: now,
        lastLoginAt: now,
        role: assignedRole ?? 'individual',
        subscription: { create: { plan: 'free' } },
      },
      update: {
        phoneVerifiedAt: now,
        lastLoginAt: now,
        ...(assignedRole ? { role: assignedRole } : {}),
      },
      include: verifyOtpUserInclude,
    });

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive or not found');
    }

    const [response, redirectPath] = await Promise.all([
      this.buildAuthResponse(user, isNewUser, rememberDevice),
      isStaffRole(user.role)
        ? Promise.resolve(this.resolveStaffRedirectPath(user.role))
        : this.resolveMemberRedirectPathForLoadedUser(user),
    ]);

    await this.primePostLoginCaches(user);

    return { ...response, redirectPath };
  }

  async restoreDeviceSession(
    rawPhone: string,
    deviceToken: string,
    purpose: AuthOtpPurpose = 'member',
  ) {
    if (!isValidBangladeshPhone(rawPhone)) {
      throw new BadRequestException('Invalid phone number');
    }

    const phone = normalizeBangladeshPhone(rawPhone);
    const staffAllowlisted = this.roleAssignment.isAllowlistedStaffPhone(phone);

    if (purpose === 'staff' && !staffAllowlisted) {
      throw new UnauthorizedException(
        'This mobile number is not authorized for staff sign-in',
      );
    }

    if (purpose === 'member' && staffAllowlisted) {
      throw new UnauthorizedException(
        'Please use the Staff tab to sign in with this number',
      );
    }

    const stored = await this.readTrustedDevice(deviceToken);
    if (!stored || stored.phone !== phone || stored.purpose !== purpose) {
      throw new UnauthorizedException('Invalid or expired device session');
    }

    const subscriptionInclude = {
      subscription: { select: { plan: true, isActive: true, endsAt: true } },
    } as const;

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      include: subscriptionInclude,
    });

    if (!user?.isActive || user.phone !== phone) {
      await this.revokeTrustedDevice(deviceToken);
      throw new UnauthorizedException('Invalid or expired device session');
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });

    await this.touchTrustedDevice(deviceToken);

    const [response, redirectPath] = await Promise.all([
      this.buildAuthResponse(user, false, true, deviceToken),
      isStaffRole(user.role)
        ? Promise.resolve(this.resolveStaffRedirectPath(user.role))
        : this.resolveMemberRedirectPath(user.id, user.role),
    ]);

    return { ...response, redirectPath };
  }

  async revokeDeviceSession(deviceToken: string) {
    await this.revokeTrustedDevice(deviceToken);
    return { revoked: true };
  }

  async registerStaff(rawEmail: string, password: string, fullName?: string) {
    if (!isValidEmail(rawEmail)) {
      throw new BadRequestException('Enter a valid email address');
    }

    const email = normalizeEmail(rawEmail);
    const role = this.roleAssignment.resolveRoleForEmail(email);

    if (!role) {
      throw new UnauthorizedException(
        'This email is not authorized for staff registration',
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const now = new Date();
    const passwordHash = await hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        emailVerifiedAt: now,
        passwordHash,
        lastLoginAt: now,
        role,
        staffProfile: {
          create: {
            fullName: fullName?.trim() || undefined,
            email,
          },
        },
      },
    });

    return this.buildAuthResponse(user, true);
  }

  async loginStaff(rawEmail: string, password: string) {
    if (!isValidEmail(rawEmail)) {
      throw new BadRequestException('Enter a valid email address');
    }

    const email = normalizeEmail(rawEmail);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const role =
      this.roleAssignment.resolveRoleForEmail(email) ??
      (isStaffRole(user.role) ? user.role : undefined);

    if (!role || !isStaffRole(role)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        role,
      },
    });

    return this.buildAuthResponse(updated, false);
  }

  private async buildAuthResponse(
    user: {
      id: string;
      phone: string | null;
      email: string | null;
      role: string;
      phoneVerifiedAt: Date | null;
      subscription?: { plan: string; isActive: boolean } | null;
    },
    isNewUser: boolean,
    rememberDevice = true,
    existingDeviceToken?: string,
  ) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });

    let deviceToken: string | null = null;
    let deviceExpiresInDays: number | null = null;

    if (rememberDevice && user.phone) {
      if (existingDeviceToken) {
        deviceToken = existingDeviceToken;
      } else {
        deviceToken = await this.issueTrustedDevice(
          user.id,
          user.phone,
          isStaffRole(user.role) ? 'staff' : 'member',
        );
      }
      deviceExpiresInDays = this.trustedDeviceDays;
    }

    return {
      accessToken,
      tokenType: 'Bearer' as const,
      isNewUser,
      deviceToken,
      deviceExpiresInDays,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        phoneVerifiedAt: user.phoneVerifiedAt,
        subscription: user.subscription ?? null,
      },
    };
  }

  async getProfile(authUser: AuthUser, includeCompletion = false) {
    if (includeCompletion) {
      const cached = this.fullProfileCache.get(authUser.id);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }

      const inflight = this.fullProfileInflight.get(authUser.id);
      if (inflight) {
        return inflight;
      }

      const request = this.loadFullProfile(authUser)
        .then((value) => {
          this.fullProfileCache.set(authUser.id, {
            expiresAt: Date.now() + AuthService.FULL_PROFILE_CACHE_TTL_MS,
            value,
          });
          return value;
        })
        .finally(() => {
          this.fullProfileInflight.delete(authUser.id);
        });
      this.fullProfileInflight.set(authUser.id, request);
      return request;
    }

    return this.loadFullProfile(authUser, false);
  }

  private async loadFullProfile(
    authUser: AuthUser,
    includeCompletion = true,
  ) {
    const [user, currentTermsVersion] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          phone: true,
          email: true,
          role: true,
          phoneVerifiedAt: true,
          emailVerifiedAt: true,
          termsAcceptedAt: true,
          termsVersion: true,
          termsDeclinedAt: true,
          lastLoginAt: true,
          createdAt: true,
          profile: {
            select: { id: true, isVerified: true },
          },
          subscription: {
            select: { plan: true, isActive: true, endsAt: true },
          },
        },
      }),
      this.legalService.getCurrentVersion(),
    ]);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const role = includeCompletion
      ? await this.roleAssignment.syncRoleForLoadedUser(user)
      : authUser.role;
    const staff = isStaffRole(role);
    const completion = includeCompletion
      ? await (staff
          ? this.staffProfiles.getCompletionSummary(authUser.id)
          : this.profiles.getCompletionSummary(authUser.id))
      : { completionPercent: 0, completionMissing: [] as string[] };

    const termsAccepted = staff
      ? true
      : hasAcceptedCurrentTerms(
          user.termsAcceptedAt,
          user.termsVersion,
          currentTermsVersion,
        );

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role,
      profileKind: staff ? 'staff' : 'member',
      phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      termsAccepted,
      termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
      termsVersion: user.termsVersion,
      currentTermsVersion,
      termsDeclinedAt: user.termsDeclinedAt?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      profile: user.profile,
      subscription: user.subscription,
      isPaidMember: isPaidMember(user.subscription),
      completionPercent: completion.completionPercent,
      completionMissing: completion.completionMissing,
    };
  }

  invalidateSessionCache(userId: string) {
    this.sessionCache.delete(userId);
    this.editorBootstrapCache.delete(userId);
  }

  async getSession(authUser: AuthUser) {
    const cached = this.sessionCache.get(authUser.id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (
      cached &&
      cached.expiresAt + SESSION_STALE_TTL_MS > Date.now()
    ) {
      void this.refreshSession(authUser);
      return cached.value;
    }

    const session = await this.buildSessionForUser(authUser);
    this.sessionCache.set(authUser.id, {
      expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
      value: session,
    });
    return session;
  }

  private refreshSession(authUser: AuthUser) {
    void this.buildSessionForUser(authUser).then((session) => {
      this.sessionCache.set(authUser.id, {
        expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
        value: session,
      });
    });
  }

  async getRedirectHint(authUser: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        phone: true,
        email: true,
        termsAcceptedAt: true,
        termsVersion: true,
        subscription: { select: { plan: true, isActive: true, endsAt: true } },
        profile: { select: memberProfileRedirectSelect },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const role = authUser.role;
    const staff = isStaffRole(role);
    const [currentTermsVersion, completion] = await Promise.all([
      this.legalService.getCurrentVersion(),
      staff
        ? this.staffProfiles.getCompletionSummary(authUser.id)
        : this.profiles.getCompletionSummary(authUser.id),
    ]);

    const termsAccepted = staff
      ? true
      : hasAcceptedCurrentTerms(
          user.termsAcceptedAt,
          user.termsVersion,
          currentTermsVersion,
        );

    const redirectPath = staff
      ? this.resolveStaffRedirectPath(role)
      : this.computeMemberRedirectPath({
          termsAccepted,
          completionPercent: completion.completionPercent,
          completionMissing: completion.completionMissing,
          isVerified: user.profile?.isVerified ?? false,
          hasVerificationRejections: user.profile
            ? hasVerificationRejections(user.profile)
            : false,
        });

    return {
      phone: user.phone,
      email: user.email,
      role,
      plan: user.subscription?.plan ?? 'free',
      termsAccepted,
      completionPercent: completion.completionPercent,
      completionMissing: completion.completionMissing,
      isVerified: user.profile?.isVerified ?? false,
      redirectPath,
    };
  }

  private computeMemberRedirectPath(input: {
    termsAccepted: boolean;
    completionPercent: number;
    completionMissing: string[];
    isVerified: boolean;
    hasVerificationRejections: boolean;
  }): string {
    if (!input.termsAccepted) {
      return '/profile';
    }
    if (
      input.completionMissing.length > 0 &&
      input.completionPercent < 100
    ) {
      return '/profile';
    }
    if (input.isVerified) {
      return '/home';
    }
    if (input.hasVerificationRejections) {
      return '/profile';
    }
    return '/discovery';
  }

  private resolveStaffRedirectPath(role: string): string {
    if (isSuperAdminRole(role)) {
      return '/admin/home';
    }
    if (isVerificationOfficerRole(role)) {
      return '/verification/home';
    }
    if (role === UserRole.MARRIAGE_CONSULTANT) {
      return '/consultant/home';
    }
    return '/profile';
  }

  private async resolveMemberRedirectPathForLoadedUser(user: {
    id: string;
    termsAcceptedAt: Date | null;
    termsVersion: string | null;
    profile: (ProfileVerificationPayload & { isVerified: boolean }) | null;
  }) {
    const [currentTermsVersion, completion] = await Promise.all([
      this.legalService.getCurrentVersion(),
      this.profiles.getCompletionSummary(user.id),
    ]);

    const termsAccepted = hasAcceptedCurrentTerms(
      user.termsAcceptedAt,
      user.termsVersion,
      currentTermsVersion,
    );

    return this.computeMemberRedirectPath({
      termsAccepted,
      completionPercent: completion.completionPercent,
      completionMissing: completion.completionMissing,
      isVerified: user.profile?.isVerified ?? false,
      hasVerificationRejections: user.profile
        ? hasVerificationRejections(user.profile)
        : false,
    });
  }

  private async resolveMemberRedirectPath(
    userId: string,
    role: string,
  ): Promise<string | null> {
    if (isStaffRole(role)) {
      return null;
    }

    const [user, currentTermsVersion, completion, profile] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { termsAcceptedAt: true, termsVersion: true },
      }),
      this.legalService.getCurrentVersion(),
      this.profiles.getCompletionSummary(userId),
      this.prisma.profile.findUnique({
        where: { userId },
        select: memberProfileRedirectSelect,
      }),
    ]);

    if (!user) {
      return '/auth';
    }

    const termsAccepted = hasAcceptedCurrentTerms(
      user.termsAcceptedAt,
      user.termsVersion,
      currentTermsVersion,
    );

    return this.computeMemberRedirectPath({
      termsAccepted,
      completionPercent: completion.completionPercent,
      completionMissing: completion.completionMissing,
      isVerified: profile?.isVerified ?? false,
      hasVerificationRejections: profile
        ? hasVerificationRejections(profile)
        : false,
    });
  }

  private async buildSessionForUser(authUser: AuthUser) {
    const [user, currentTermsVersion] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          termsAcceptedAt: true,
          termsVersion: true,
          termsDeclinedAt: true,
          subscription: { select: { plan: true, isActive: true, endsAt: true } },
          profile: { select: { isVerified: true, isPaused: true, pausedAt: true } },
        },
      }),
      this.legalService.getCurrentVersion(),
    ]);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const role = authUser.role;
    const staff = isStaffRole(role);
    const termsAccepted = staff
      ? true
      : hasAcceptedCurrentTerms(
          user.termsAcceptedAt,
          user.termsVersion,
          currentTermsVersion,
        );

    return {
      role,
      profileKind: staff ? ('staff' as const) : ('member' as const),
      termsAccepted,
      termsVersion: user.termsVersion,
      currentTermsVersion,
      termsDeclinedAt: user.termsDeclinedAt?.toISOString() ?? null,
      subscription: user.subscription,
      isPaidMember: isPaidMember(user.subscription),
      hasProfile: user.profile != null,
      isVerified: user.profile?.isVerified ?? false,
      isPaused: user.profile?.isPaused ?? false,
      pausedAt: user.profile?.pausedAt?.toISOString() ?? null,
    };
  }

  private async primePostLoginCaches(user: {
    id: string;
    phone: string | null;
    email: string | null;
    role: string;
    termsAcceptedAt: Date | null;
    termsVersion: string | null;
    termsDeclinedAt: Date | null;
    subscription?: {
      plan: string;
      isActive: boolean;
      endsAt: Date | null;
    } | null;
    profile?: { isVerified: boolean; isPaused?: boolean; pausedAt?: Date | null } | null;
  }) {
    const authUser: AuthUser = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    };
    this.authUserCache.set(user.id, authUser);

    const currentTermsVersion = await this.legalService.getCurrentVersion();
    const staff = isStaffRole(user.role);
    const termsAccepted = staff
      ? true
      : hasAcceptedCurrentTerms(
          user.termsAcceptedAt,
          user.termsVersion,
          currentTermsVersion,
        );
    const session = {
      role: user.role,
      profileKind: staff ? ('staff' as const) : ('member' as const),
      termsAccepted,
      termsVersion: user.termsVersion,
      currentTermsVersion,
      termsDeclinedAt: user.termsDeclinedAt?.toISOString() ?? null,
      subscription: user.subscription ?? null,
      isPaidMember: isPaidMember(user.subscription),
      hasProfile: user.profile != null,
      isVerified: user.profile?.isVerified ?? false,
      isPaused: user.profile?.isPaused ?? false,
      pausedAt: user.profile?.pausedAt?.toISOString() ?? null,
    };
    this.sessionCache.set(user.id, {
      expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
      value: session as Awaited<ReturnType<AuthService['buildSessionForUser']>>,
    });
    this.subscriptionAccess.primePaidMember(
      user.id,
      isPaidMember(user.subscription),
    );
    this.memberCacheWarmup.warm(user.id, user.role);
  }

  clearSessionCache(userId: string) {
    this.sessionCache.delete(userId);
  }

  clearEditorBootstrapCache(userId: string) {
    for (const key of this.editorBootstrapCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.editorBootstrapCache.delete(key);
      }
    }
  }

  async getBiodataBootstrap(userId: string, level: number, locale: string) {
    await this.subscriptionAccess.assertPaidMember(userId);

    const [user, currentTermsVersion, exportData, dropdowns] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            role: true,
            termsAcceptedAt: true,
            termsVersion: true,
          },
        }),
        this.legalService.getCurrentVersion(),
        this.profiles.exportBiodataAtLevel(userId, level),
        this.dropdownsService.getPublicDropdowns(undefined, locale),
      ]);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (isStaffRole(user.role)) {
      throw new BadRequestException('Staff accounts cannot export member biodata');
    }

    const termsAccepted = hasAcceptedCurrentTerms(
      user.termsAcceptedAt,
      user.termsVersion,
      currentTermsVersion,
    );

    return {
      termsAccepted,
      export: termsAccepted ? exportData : null,
      dropdowns: termsAccepted ? dropdowns : null,
    };
  }

  async getEditorBootstrap(authUser: AuthUser, locale: string) {
    const cacheKey = `${authUser.id}:${locale}`;
    const cached = this.editorBootstrapCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (
      cached &&
      cached.expiresAt + EDITOR_BOOTSTRAP_STALE_TTL_MS > Date.now()
    ) {
      void this.refreshEditorBootstrap(authUser, locale);
      return cached.value;
    }

    return this.loadEditorBootstrap(authUser, locale);
  }

  private refreshEditorBootstrap(authUser: AuthUser, locale: string) {
    void this.loadEditorBootstrap(authUser, locale);
  }

  private async loadEditorBootstrap(authUser: AuthUser, locale: string) {
    const cacheKey = `${authUser.id}:${locale}`;
    const staffFromJwt = isStaffRole(authUser.role);

    const [user, currentTermsVersion, dropdowns, profile, verificationFeedback] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: authUser.id },
          select: {
            role: true,
            termsAcceptedAt: true,
            termsVersion: true,
            termsDeclinedAt: true,
          },
        }),
        this.legalService.getCurrentVersion(),
        this.dropdownsService.getPublicDropdowns(undefined, locale),
        staffFromJwt
          ? this.staffProfiles.getMyStaffProfile(authUser.id)
          : this.profiles.getMyProfile(authUser.id),
        staffFromJwt
          ? Promise.resolve(null)
          : this.mediaService.getVerificationFeedback(authUser.id),
      ]);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const staffFromDb = isStaffRole(authUser.role);
    const termsAccepted = staffFromDb
      ? true
      : hasAcceptedCurrentTerms(
          user.termsAcceptedAt,
          user.termsVersion,
          currentTermsVersion,
        );

    if (!staffFromDb && !termsAccepted) {
      const declinedPayload = {
        role: authUser.role,
        profileKind: 'member' as const,
        termsAccepted,
        termsVersion: user.termsVersion,
        currentTermsVersion,
        termsDeclinedAt: user.termsDeclinedAt?.toISOString() ?? null,
        profile: null,
        dropdowns: null,
        verificationFeedback: null,
      };
      this.editorBootstrapCache.set(cacheKey, {
        expiresAt: Date.now() + EDITOR_BOOTSTRAP_CACHE_TTL_MS,
        value: declinedPayload,
      });
      return declinedPayload;
    }

    const staff = isStaffRole(authUser.role);

    const memberProfile =
      !staff && profile && 'creationMode' in profile ? profile : null;

    const payload = {
      role: authUser.role,
      profileKind: staff ? ('staff' as const) : ('member' as const),
      termsAccepted,
      termsVersion: user.termsVersion,
      currentTermsVersion,
      termsDeclinedAt: user.termsDeclinedAt?.toISOString() ?? null,
      creationMode: memberProfile?.creationMode ?? null,
      onBehalfRelation: memberProfile?.onBehalfRelation ?? null,
      profile,
      dropdowns,
      verificationFeedback,
      completionPercent: profile?.completionPercent ?? 0,
      completionMissing: profile?.completionMissing ?? [],
    };

    this.editorBootstrapCache.set(cacheKey, {
      expiresAt: Date.now() + EDITOR_BOOTSTRAP_CACHE_TTL_MS,
      value: payload,
    });

    return payload;
  }

  async acceptTerms(userId: string, version: string) {
    const currentTermsVersion = await this.legalService.getCurrentVersion();
    if (version !== currentTermsVersion) {
      throw new BadRequestException(
        'Terms version mismatch. Please refresh and accept the latest terms.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (isStaffRole(user.role)) {
      return { accepted: true, termsVersion: currentTermsVersion };
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: now,
        termsVersion: currentTermsVersion,
        termsDeclinedAt: null,
      },
    });

    this.clearSessionCache(userId);
    this.clearEditorBootstrapCache(userId);

    return {
      accepted: true,
      termsVersion: currentTermsVersion,
      termsAcceptedAt: now.toISOString(),
    };
  }

  async declineTerms(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (isStaffRole(user.role)) {
      return { declined: true };
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: null,
        termsVersion: null,
        termsDeclinedAt: now,
      },
    });

    this.clearSessionCache(userId);
    this.clearEditorBootstrapCache(userId);

    return { declined: true, termsDeclinedAt: now.toISOString() };
  }

  private async enforceRateLimit(phone: string) {
    const rateKey = `${OTP_RATE_KEY_PREFIX}${phone}`;
    const attempts = await this.redis.incr(rateKey);

    if (attempts === 1) {
      await this.redis.expire(rateKey, this.otpRateWindowSeconds);
    }

    if (attempts > this.otpRateLimit) {
      throw new HttpException(
        'Too many OTP requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private trustedDeviceTtlSeconds(): number {
    return this.trustedDeviceDays * 86_400;
  }

  private hashDeviceToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private deviceRedisKey(tokenHash: string): string {
    return `${DEVICE_KEY_PREFIX}${tokenHash}`;
  }

  private async issueTrustedDevice(
    userId: string,
    phone: string,
    purpose: AuthOtpPurpose,
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const payload = JSON.stringify({ userId, phone, purpose });
    await this.redis.set(
      this.deviceRedisKey(this.hashDeviceToken(token)),
      payload,
      this.trustedDeviceTtlSeconds(),
    );
    return token;
  }

  private async readTrustedDevice(
    token: string,
  ): Promise<{ userId: string; phone: string; purpose: AuthOtpPurpose } | null> {
    const raw = await this.redis.get(this.deviceRedisKey(this.hashDeviceToken(token)));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as {
        userId?: string;
        phone?: string;
        purpose?: AuthOtpPurpose;
      };
      if (!parsed.userId || !parsed.phone || !parsed.purpose) return null;
      return {
        userId: parsed.userId,
        phone: parsed.phone,
        purpose: parsed.purpose,
      };
    } catch {
      return null;
    }
  }

  private async touchTrustedDevice(token: string) {
    const key = this.deviceRedisKey(this.hashDeviceToken(token));
    const raw = await this.redis.get(key);
    if (!raw) return;
    await this.redis.set(key, raw, this.trustedDeviceTtlSeconds());
  }

  private async revokeTrustedDevice(token: string) {
    await this.redis.del(this.deviceRedisKey(this.hashDeviceToken(token)));
  }

  registerPushToken(userId: string, token: string, platform?: string) {
    return this.pushNotifications.registerToken(userId, token, platform);
  }

  async registerPushTokenForDevice(
    rawPhone: string,
    deviceToken: string,
    pushToken: string,
    platform?: string,
  ) {
    if (!isValidBangladeshPhone(rawPhone)) {
      throw new BadRequestException('Invalid phone number');
    }

    const phone = normalizeBangladeshPhone(rawPhone);
    const stored = await this.readTrustedDevice(deviceToken);
    if (!stored || stored.phone !== phone || stored.purpose !== 'member') {
      throw new UnauthorizedException('Invalid or expired device session');
    }

    return this.pushNotifications.registerToken(
      stored.userId,
      pushToken,
      platform,
    );
  }

  removePushToken(userId: string, token: string) {
    return this.pushNotifications.removeToken(userId, token);
  }

  getPushTokenStatus(userId: string) {
    return this.pushNotifications
      .countTokensForUser(userId)
      .then((count) => ({ registered: count > 0, count }));
  }
}
