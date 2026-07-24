import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  clampPublicBrowseLimit,
  isValidProfileCode,
  normalizeProfileCode,
  PUBLIC_BROWSE_DEFAULT_LIMIT,
  PUBLIC_BROWSE_PRIVACY_LEVEL,
} from '@easymatch/shared';
import { MediaReviewStatus } from '@prisma/client';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import {
  buildVisibleProfileView,
  type PrivacyRule,
  type VisibleProfileView,
} from '../privacy/profile-privacy-filter';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPublicBrowseProfileWhere,
  type DiscoveryFilterInput,
} from './discovery-filters';

const publicBrowseInclude = {
  user: { select: { id: true, phone: true } },
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
  photos: {
    where: { status: MediaReviewStatus.approved },
  },
  nidDocuments: true,
};

type RateBucket = { count: number; resetAt: number };

@Injectable()
export class PublicBrowseService {
  private readonly rateBuckets = new Map<string, RateBucket>();
  private readonly rateLimitPerMinute = 90;
  private platformStatsCache: {
    expiresAt: number;
    value: { verifiedProfileCount: number };
  } | null = null;
  private readonly listProfilesCache = new Map<
    string,
    { expiresAt: number; value: Awaited<ReturnType<PublicBrowseService['fetchProfiles']>> }
  >();
  private privacyRulesCache: {
    expiresAt: number;
    value: PrivacyRule[];
  } | null = null;
  private static readonly STATS_CACHE_TTL_MS = 60_000;
  private static readonly LIST_CACHE_TTL_MS = 30_000;
  private static readonly PRIVACY_RULES_CACHE_TTL_MS = 300_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly privacyFields: PrivacyFieldsService,
  ) {}

  assertRateLimit(clientKey: string) {
    const now = Date.now();
    const bucket = this.rateBuckets.get(clientKey);
    if (!bucket || now >= bucket.resetAt) {
      this.rateBuckets.set(clientKey, {
        count: 1,
        resetAt: now + 60_000,
      });
      return;
    }

    bucket.count += 1;
    if (bucket.count > this.rateLimitPerMinute) {
      throw new HttpException(
        'Too many requests. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async listProfiles(
    filters: DiscoveryFilterInput,
    limit = PUBLIC_BROWSE_DEFAULT_LIMIT,
    options?: { skipTotal?: boolean },
  ) {
    if (!filters.gender) {
      throw new BadRequestException(
        'gender is required (male or female) for public browse',
      );
    }

    const resultLimit = clampPublicBrowseLimit(limit);
    const cacheKey = JSON.stringify({
      filters,
      limit: resultLimit,
      skipTotal: Boolean(options?.skipTotal),
    });
    const cached = this.listProfilesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const value = await this.fetchProfiles(filters, resultLimit, options);
    this.listProfilesCache.set(cacheKey, {
      expiresAt: Date.now() + PublicBrowseService.LIST_CACHE_TTL_MS,
      value,
    });
    return value;
  }

  private async fetchProfiles(
    filters: DiscoveryFilterInput,
    resultLimit: number,
    options?: { skipTotal?: boolean },
  ) {
    const rules = await this.loadPrivacyRules();
    const where = buildPublicBrowseProfileWhere(filters);
    const skipTotal = Boolean(options?.skipTotal);

    const profiles = await this.prisma.profile.findMany({
      where,
      include: publicBrowseInclude,
      orderBy: { updatedAt: 'desc' },
      take: resultLimit,
    });

    const total = skipTotal
      ? profiles.length
      : await this.prisma.profile.count({ where });

    const items = profiles.map((profile) => {
      const view = buildVisibleProfileView(
        profile,
        rules,
        PUBLIC_BROWSE_PRIVACY_LEVEL,
      );
      return this.toPublicListItem(profile.id, profile.profileCode, view);
    });

    return {
      items,
      total,
      limit: resultLimit,
      browseLevel: PUBLIC_BROWSE_PRIVACY_LEVEL,
    };
  }

  async getPlatformStats() {
    if (
      this.platformStatsCache &&
      this.platformStatsCache.expiresAt > Date.now()
    ) {
      return this.platformStatsCache.value;
    }

    const verifiedProfileCount = await this.prisma.profile.count({
      where: {
        isVerified: true,
        user: { isActive: true },
      },
    });

    const value = { verifiedProfileCount };
    this.platformStatsCache = {
      expiresAt: Date.now() + PublicBrowseService.STATS_CACHE_TTL_MS,
      value,
    };
    return value;
  }

  async getProfile(profileCodeInput: string) {
    const profileCode = isValidProfileCode(profileCodeInput)
      ? normalizeProfileCode(profileCodeInput)
      : null;

    if (!profileCode) {
      throw new NotFoundException('Profile not found');
    }

    const profile = await this.prisma.profile.findFirst({
      where: {
        profileCode,
        isVerified: true,
        user: { isActive: true },
      },
      include: publicBrowseInclude,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const rules = await this.loadPrivacyRules();
    const view = buildVisibleProfileView(
      profile,
      rules,
      PUBLIC_BROWSE_PRIVACY_LEVEL,
    );

    return {
      profileCode: profile.profileCode,
      browseLevel: PUBLIC_BROWSE_PRIVACY_LEVEL,
      ...this.toPublicDetailView(view),
    };
  }

  private toPublicListItem(
    profileId: string,
    profileCode: string,
    view: VisibleProfileView,
  ) {
    return {
      profileId,
      profileCode,
      personal: view.personal,
      family: view.family,
      media: this.sanitizePublicMedia(view.media),
      hiddenFieldCount: view.hiddenFieldCount,
    };
  }

  private toPublicDetailView(view: VisibleProfileView) {
    return {
      personal: view.personal,
      marital: view.marital,
      family: view.family,
      siblings: view.siblings,
      paternalRelatives: view.paternalRelatives,
      maternalRelatives: view.maternalRelatives,
      partner: view.partner,
      media: this.sanitizePublicMedia(view.media),
      visibleFieldKeys: view.visibleFieldKeys,
      hiddenFieldCount: view.hiddenFieldCount,
    };
  }

  private sanitizePublicMedia(media: VisibleProfileView['media']) {
    return {
      isVerified: media.isVerified,
      verifiedOnBehalf: media.verifiedOnBehalf,
      memberNidVerified: media.memberNidVerified,
    };
  }

  private async loadPrivacyRules(): Promise<PrivacyRule[]> {
    if (
      this.privacyRulesCache &&
      this.privacyRulesCache.expiresAt > Date.now()
    ) {
      return this.privacyRulesCache.value;
    }

    const rows = await this.privacyFields.listAll();
    const value = rows.map((row) => ({
      fieldKey: row.fieldKey,
      isShareable: row.isShareable,
      minPrivacyLevel: row.minPrivacyLevel,
    }));
    this.privacyRulesCache = {
      expiresAt: Date.now() + PublicBrowseService.PRIVACY_RULES_CACHE_TTL_MS,
      value,
    };
    return value;
  }
}
