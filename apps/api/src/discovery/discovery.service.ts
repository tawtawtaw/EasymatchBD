import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { MediaReviewStatus, ProfilePhotoType, type Prisma } from '@prisma/client';
import {
  ageFromDateOfBirth,
  calculateCompatibility,
  clampDiscoveryProfileLimit,
  DISCOVERY_CANDIDATE_POOL_LIMIT,
  DISCOVERY_DEFAULT_PROFILE_LIMIT,
  DISCOVERY_HOME_SUGGESTION_POOL_LIMIT,
  getOppositeGender,
  hasAcceptedCurrentTerms,
  isStaffRole,
  isValidProfileCode,
  normalizeProfileCode,
  PrivacyLevel,
  type PartnerPreferenceInput,
  type PhotoVariant,
} from '@easymatch/shared';
import { LegalService } from '../legal/legal.service';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import {
  buildVisibleProfileView,
  type PrivacyRule,
} from '../privacy/profile-privacy-filter';
import { getCachedPrivacyRules } from '../privacy/privacy-rules-cache';
import { ProfilesService } from '../profiles/profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PhotoVariantService } from '../storage/photo-variant.service';
import { ConnectionsService } from './connections.service';
import {
  invalidateDiscoveryListCache,
  registerDiscoveryListCacheInvalidator,
} from './discovery-list-cache';
import { registerHomeBootstrapCacheInvalidator } from './discovery-home-bootstrap-cache';
import {
  buildDiscoveryProfileWhere,
  type DiscoveryFilterInput,
} from './discovery-filters';

const profileInclude = {
  user: { select: { id: true, phone: true } },
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
  photos: {
    where: { status: MediaReviewStatus.approved },
  },
};

const profileStubSelect = {
  id: true,
  userId: true,
  gender: true,
  isVerified: true,
  profileCode: true,
} as const;

type ProfileStub = {
  id: string;
  userId: string;
  gender: string | null;
  isVerified: boolean;
  profileCode: string | null;
};

type ProfileVisibilityInput = Pick<
  ProfileStub,
  'userId' | 'gender' | 'isVerified'
>;

const discoveryListInclude = {
  user: { select: { id: true, phone: true } },
  photos: {
    where: { status: MediaReviewStatus.approved },
  },
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
};

const discoveryListIncludeLite = {
  user: { select: { id: true, phone: true } },
  photos: {
    where: { status: MediaReviewStatus.approved },
  },
  familyInfo: true,
  partnerPreference: true,
};

type DiscoveryViewerProfile = {
  gender: string | null;
  religion: string | null;
  partnerPreference: PartnerPreferenceInput | null;
};

type ListProfilesOptions = {
  candidatePoolLimit?: number;
  lite?: boolean;
  skipTotalCount?: boolean;
  skipBookmarks?: boolean;
  viewerProfile?: DiscoveryViewerProfile | null;
};

type DiscoveryListProfileItem = {
  profileId: string;
  profileCode: string | null;
  userId: string;
  viewerPrivacyLevel: number;
  relationshipStatus: 'none' | 'interest_sent' | 'interest_received' | 'connected';
  personal: ReturnType<typeof buildVisibleProfileView>['personal'];
  media: ReturnType<typeof buildVisibleProfileView>['media'];
  hiddenFieldCount: number;
  compatibility: ReturnType<typeof calculateCompatibility>;
  /**
   * Derived rather than read from `personal`, because the exact date of birth
   * stays behind its privacy rule while the age itself is already public: the
   * discovery filters let anyone narrow by an age range, and the comparison
   * matrix shows it too.
   */
  age: number | null;
  isBookmarked: boolean;
};

type DiscoveryListProfilesResponse = {
  items: DiscoveryListProfileItem[];
  total: number;
  page: number;
  limit: number;
  /**
   * Whether a further page exists. `total` counts every profile matching the
   * filters, but only the candidate pool is ranked and reachable, so a client
   * comparing what it holds against `total` would page forever.
   */
  hasMore: boolean;
};

/**
 * The whole ranked candidate pool, which pages are cut from. Ranking costs the
 * same whichever page is asked for, so it is done once and cached, leaving
 * later pages as slices of one snapshot rather than separate queries that could
 * shift underneath the reader.
 */
type RankedListProfiles = {
  items: DiscoveryListProfileItem[];
  total: number;
};

type MemberHomeBootstrapResponse = {
  termsAccepted: boolean;
  profile: {
    fullName: string | null;
    profileCode: string | null;
    isVerified: boolean;
    completionPercent: number;
    primaryPhotoId: string | null;
  };
  stats: {
    incoming: number;
    outgoing: number;
    connections: number;
    conversations: number;
  };
  suggestions: DiscoveryListProfileItem[];
};

const DISCOVERY_TOP_MATCH_LIMIT = DISCOVERY_DEFAULT_PROFILE_LIMIT;
const HOME_BOOTSTRAP_CACHE_TTL_MS = 45_000;
const HOME_BOOTSTRAP_STALE_TTL_MS = 180_000;
const PROFILE_VIEW_CACHE_TTL_MS = 60_000;
const LIST_PROFILES_CACHE_TTL_MS = 45_000;
const LIST_TOTAL_CACHE_TTL_MS = 90_000;
const VIEWER_PROFILE_CACHE_TTL_MS = 30_000;

type ProfileViewPayload = Awaited<
  ReturnType<DiscoveryService['buildProfileView']>
>;

@Injectable()
export class DiscoveryService implements OnModuleInit {
  private readonly homeBootstrapCache = new Map<
    string,
    { expiresAt: number; value: MemberHomeBootstrapResponse }
  >();
  private readonly profileViewCache = new Map<
    string,
    { expiresAt: number; value: ProfileViewPayload }
  >();
  private readonly profileViewInflight = new Map<
    string,
    Promise<ProfileViewPayload>
  >();
  private readonly listProfilesCache = new Map<
    string,
    { expiresAt: number; value: RankedListProfiles }
  >();
  private readonly listProfilesInflight = new Map<
    string,
    Promise<RankedListProfiles>
  >();
  private readonly listTotalCache = new Map<
    string,
    { expiresAt: number; value: number }
  >();
  private readonly viewerProfileCache = new Map<
    string,
    { expiresAt: number; value: DiscoveryViewerProfile | null }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly privacyFields: PrivacyFieldsService,
    private readonly connections: ConnectionsService,
    private readonly storage: StorageService,
    private readonly photoVariants: PhotoVariantService,
    private readonly profiles: ProfilesService,
    private readonly legal: LegalService,
  ) {}

  onModuleInit() {
    registerHomeBootstrapCacheInvalidator((userId) => {
      this.homeBootstrapCache.delete(userId);
    });
    registerDiscoveryListCacheInvalidator((userId) => {
      this.invalidateDiscoveryListCache(userId);
    });
  }

  async listProfiles(
    viewerUserId: string,
    page = 1,
    limit = DISCOVERY_TOP_MATCH_LIMIT,
    filters: DiscoveryFilterInput = {},
    options: ListProfilesOptions = {},
  ): Promise<DiscoveryListProfilesResponse> {
    const resultLimit = clampDiscoveryProfileLimit(limit);
    const pageNumber =
      Number.isFinite(page) && page >= 1 ? Math.trunc(page) : 1;

    const ranked = await this.loadRankedListProfiles(
      viewerUserId,
      limit,
      filters,
      options,
    );

    const start = (pageNumber - 1) * resultLimit;
    const items = ranked.items.slice(start, start + resultLimit);

    return {
      items,
      total: ranked.total,
      page: pageNumber,
      limit: resultLimit,
      hasMore: start + items.length < ranked.items.length,
    };
  }

  private async loadRankedListProfiles(
    viewerUserId: string,
    limit: number,
    filters: DiscoveryFilterInput,
    options: ListProfilesOptions,
  ): Promise<RankedListProfiles> {
    const cacheKey = this.buildListProfilesCacheKey(
      viewerUserId,
      limit,
      filters,
      options,
    );
    const cached = this.listProfilesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inflight = this.listProfilesInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const request = this.loadListProfiles(
      viewerUserId,
      limit,
      filters,
      options,
    )
      .then((value) => {
        this.listProfilesCache.set(cacheKey, {
          expiresAt: Date.now() + LIST_PROFILES_CACHE_TTL_MS,
          value,
        });
        return value;
      })
      .finally(() => {
        this.listProfilesInflight.delete(cacheKey);
      });
    this.listProfilesInflight.set(cacheKey, request);
    return request;
  }

  invalidateDiscoveryListCache(viewerUserId: string) {
    for (const key of this.listProfilesCache.keys()) {
      if (key.startsWith(`${viewerUserId}:`)) {
        this.listProfilesCache.delete(key);
      }
    }
    for (const key of this.listProfilesInflight.keys()) {
      if (key.startsWith(`${viewerUserId}:`)) {
        this.listProfilesInflight.delete(key);
      }
    }
    for (const key of this.listTotalCache.keys()) {
      if (key.startsWith(`${viewerUserId}:`)) {
        this.listTotalCache.delete(key);
      }
    }
    this.viewerProfileCache.delete(viewerUserId);
  }

  private buildListProfilesCacheKey(
    viewerUserId: string,
    limit: number,
    filters: DiscoveryFilterInput,
    options: ListProfilesOptions,
  ) {
    return `${viewerUserId}:${JSON.stringify({
      limit: clampDiscoveryProfileLimit(limit),
      filters: this.stableFilterKey(filters),
      candidatePoolLimit: options.candidatePoolLimit ?? null,
      lite: options.lite ?? false,
      skipTotalCount: options.skipTotalCount ?? false,
      skipBookmarks: options.skipBookmarks ?? false,
    })}`;
  }

  private stableFilterKey(filters: DiscoveryFilterInput) {
    const entries = Object.entries(filters)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries);
  }

  private buildListTotalCacheKey(
    viewerUserId: string,
    filters: DiscoveryFilterInput,
    viewerGender?: string | null,
  ) {
    return `${viewerUserId}:total:${viewerGender ?? ''}:${JSON.stringify(this.stableFilterKey(filters))}`;
  }

  private async resolveListTotal(
    cacheKey: string,
    where: Prisma.ProfileWhereInput,
  ) {
    const cached = this.listTotalCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const total = await this.prisma.profile.count({ where });
    this.listTotalCache.set(cacheKey, {
      expiresAt: Date.now() + LIST_TOTAL_CACHE_TTL_MS,
      value: total,
    });
    return total;
  }

  private async loadViewerProfile(
    viewerUserId: string,
  ): Promise<DiscoveryViewerProfile | null> {
    const cached = this.viewerProfileCache.get(viewerUserId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId: viewerUserId },
      include: { partnerPreference: true },
    });
    const value = profile
      ? {
          gender: profile.gender,
          religion: profile.religion,
          partnerPreference: profile.partnerPreference,
        }
      : null;

    this.viewerProfileCache.set(viewerUserId, {
      expiresAt: Date.now() + VIEWER_PROFILE_CACHE_TTL_MS,
      value,
    });
    return value;
  }

  private async loadListProfiles(
    viewerUserId: string,
    limit: number,
    filters: DiscoveryFilterInput,
    options: ListProfilesOptions,
  ): Promise<RankedListProfiles> {
    const rules = await this.loadPrivacyRules();
    const resultLimit = clampDiscoveryProfileLimit(limit);
    const poolCap =
      options.candidatePoolLimit ?? DISCOVERY_CANDIDATE_POOL_LIMIT;
    const include = options.lite ? discoveryListIncludeLite : discoveryListInclude;

    const viewerProfile =
      options.viewerProfile !== undefined
        ? options.viewerProfile
        : await this.loadViewerProfile(viewerUserId);

    const oppositeGender = getOppositeGender(viewerProfile?.gender);
    if (!oppositeGender) {
      return { items: [], total: 0 };
    }

    const where = buildDiscoveryProfileWhere(
      viewerUserId,
      filters,
      viewerProfile?.gender,
    );

    const candidateTake = Math.max(
      resultLimit,
      Math.min(poolCap, resultLimit * 6),
    );

    const profilesPromise = this.prisma.profile.findMany({
      where,
      include,
      orderBy: { updatedAt: 'desc' },
      take: candidateTake,
    });

    const totalPromise = options.skipTotalCount
      ? Promise.resolve(0)
      : this.resolveListTotal(
          this.buildListTotalCacheKey(
            viewerUserId,
            filters,
            viewerProfile?.gender,
          ),
          where,
        );

    const [total, profiles] = await Promise.all([
      totalPromise,
      profilesPromise,
    ]);

    if (profiles.length === 0) {
      return { items: [], total: 0 };
    }

    const relationshipMap =
      await this.connections.batchGetListRelationshipSummaries(
        viewerUserId,
        profiles.map((profile) => profile.userId),
      );

    const bookmarkSet = options.skipBookmarks
      ? new Set<string>()
      : new Set(
          (
            await this.prisma.profileBookmark.findMany({
              where: {
                userId: viewerUserId,
                profileId: { in: profiles.map((profile) => profile.id) },
              },
              select: { profileId: true },
            })
          ).map((row) => row.profileId),
        );

    const items = profiles.map((profile) => {
      const relationship = relationshipMap.get(profile.userId) ?? {
        status: 'none' as const,
        viewerPrivacyLevel: PrivacyLevel.PUBLIC,
      };
      const view = buildVisibleProfileView(
        options.lite
          ? {
              ...profile,
              siblings: [],
              paternalRelatives: [],
              maternalRelatives: [],
              nidDocuments: [],
            }
          : {
              ...profile,
              nidDocuments: [],
            },
        rules,
        relationship.viewerPrivacyLevel,
      );
      const compatibility = calculateCompatibility(
        viewerProfile?.partnerPreference,
        profile,
        {
          viewerGender: viewerProfile?.gender,
          viewerReligion: viewerProfile?.religion,
        },
      );

      return {
        profileId: profile.id,
        profileCode: profile.profileCode,
        userId: profile.userId,
        viewerPrivacyLevel: relationship.viewerPrivacyLevel,
        relationshipStatus: relationship.status,
        personal: view.personal,
        media: view.media,
        hiddenFieldCount: view.hiddenFieldCount,
        compatibility,
        age: profile.dateOfBirth ? ageFromDateOfBirth(profile.dateOfBirth) : null,
        isBookmarked: options.skipBookmarks ? false : bookmarkSet.has(profile.id),
      };
    });

    items.sort((a, b) => {
      const scoreDiff = b.compatibility.score - a.compatibility.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return b.compatibility.matchedCount - a.compatibility.matchedCount;
    });

    return { items, total };
  }

  async getProfile(viewerUserId: string, profileIdOrCode: string) {
    const cacheKey = `${viewerUserId}:${profileIdOrCode}`;
    const cached = this.profileViewCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inflight = this.profileViewInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const request = this.buildProfileView(viewerUserId, profileIdOrCode)
      .then((value) => {
        this.profileViewCache.set(cacheKey, {
          expiresAt: Date.now() + PROFILE_VIEW_CACHE_TTL_MS,
          value,
        });
        return value;
      })
      .finally(() => {
        this.profileViewInflight.delete(cacheKey);
      });
    this.profileViewInflight.set(cacheKey, request);
    return request;
  }

  invalidateProfileViewCache(
    viewerUserId: string,
    profileIdOrCode?: string,
  ) {
    if (profileIdOrCode) {
      const cacheKey = `${viewerUserId}:${profileIdOrCode}`;
      this.profileViewCache.delete(cacheKey);
      this.profileViewInflight.delete(cacheKey);
      return;
    }

    for (const key of this.profileViewCache.keys()) {
      if (key.startsWith(`${viewerUserId}:`)) {
        this.profileViewCache.delete(key);
      }
    }
    for (const key of this.profileViewInflight.keys()) {
      if (key.startsWith(`${viewerUserId}:`)) {
        this.profileViewInflight.delete(key);
      }
    }
  }

  private async buildProfileView(
    viewerUserId: string,
    profileIdOrCode: string,
  ) {
    const stub = await this.findProfileStubByIdOrCode(profileIdOrCode);
    if (!stub) {
      throw new NotFoundException('Profile not found');
    }

    const [
      rules,
      relationship,
      viewerProfile,
      bookmark,
    ] = await Promise.all([
      this.loadPrivacyRules(),
      this.connections.getRelationshipSummary(viewerUserId, stub.userId),
      this.loadViewerProfile(viewerUserId),
      this.prisma.profileBookmark.findUnique({
        where: {
          userId_profileId: { userId: viewerUserId, profileId: stub.id },
        },
        select: { id: true },
      }),
    ]);

    if (
      !this.isProfileVisibleWithRelationship(
        viewerUserId,
        stub,
        relationship.status,
        viewerProfile?.gender ?? null,
      )
    ) {
      throw new NotFoundException('Profile not found');
    }

    const profile = await this.prisma.profile.findFirst({
      where: { id: stub.id },
      include: profileInclude,
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const viewerLevel = relationship.viewerPrivacyLevel;
    const view = buildVisibleProfileView(profile, rules, viewerLevel);
    const compatibility = calculateCompatibility(
      viewerProfile?.partnerPreference,
      profile,
      {
        viewerGender: viewerProfile?.gender,
        viewerReligion: viewerProfile?.religion,
      },
    );

    return {
      profileId: profile.id,
      profileCode: profile.profileCode,
      userId: profile.userId,
      viewerPrivacyLevel: viewerLevel,
      relationship,
      compatibility,
      age: profile.dateOfBirth ? ageFromDateOfBirth(profile.dateOfBirth) : null,
      isBookmarked: !!bookmark,
      ...view,
    };
  }

  async getVisiblePhotoFile(
    viewerUserId: string,
    profileIdOrCode: string,
    photoId: string,
    variant: PhotoVariant = 'original',
  ) {
    const viewCacheKey = `${viewerUserId}:${profileIdOrCode}`;
    let cachedView = this.profileViewCache.get(viewCacheKey);
    if (!cachedView || cachedView.expiresAt <= Date.now()) {
      try {
        await this.getProfile(viewerUserId, profileIdOrCode);
      } catch {
        // fall through to legacy photo resolution
      }
      cachedView = this.profileViewCache.get(viewCacheKey);
    }

    if (cachedView && cachedView.expiresAt > Date.now()) {
      const view = cachedView.value;
      const allowedIds = [
        ...(view.media.primaryPhotoId ? [view.media.primaryPhotoId] : []),
        ...view.media.galleryPhotoIds,
      ];
      if (!allowedIds.includes(photoId)) {
        throw new ForbiddenException(
          'Photo is not visible at your privacy level',
        );
      }

      const photo = await this.prisma.profilePhoto.findFirst({
        where: {
          id: photoId,
          profileId: view.profileId,
          status: MediaReviewStatus.approved,
        },
        select: { storageKey: true, mimeType: true },
      });
      if (!photo || !(await this.storage.exists(photo.storageKey))) {
        throw new NotFoundException('Photo not found');
      }

      return this.photoVariants.streamOriginalOrVariant(
        photo.storageKey,
        photo.mimeType,
        variant,
      );
    }

    const profile = await this.findProfileForViewer(
      viewerUserId,
      profileIdOrCode,
    );

    if (!profile) {
      throw new NotFoundException('Photo not found');
    }

    const rules = await this.loadPrivacyRules();
    const viewerLevel = await this.connections.getViewerPrivacyLevel(
      viewerUserId,
      profile.userId,
    );
    const view = buildVisibleProfileView(profile, rules, viewerLevel);

    const allowedIds = [
      ...(view.media.primaryPhotoId ? [view.media.primaryPhotoId] : []),
      ...view.media.galleryPhotoIds,
    ];
    if (!allowedIds.includes(photoId)) {
      throw new ForbiddenException('Photo is not visible at your privacy level');
    }

    const photo = (profile.photos ?? []).find(
      (item) =>
        item.id === photoId && item.status === MediaReviewStatus.approved,
    );
    if (!photo || !(await this.storage.exists(photo.storageKey))) {
      throw new NotFoundException('Photo not found');
    }

    return this.photoVariants.streamOriginalOrVariant(
      photo.storageKey,
      photo.mimeType,
      variant,
    );
  }

  async resolveBookmarkTarget(viewerUserId: string, profileIdOrCode: string) {
    const stub = await this.findProfileStubByIdOrCode(profileIdOrCode);
    if (!stub) {
      throw new NotFoundException('Profile not found');
    }

    const [relationship, viewerProfile] = await Promise.all([
      this.connections.getRelationshipSummary(viewerUserId, stub.userId),
      viewerUserId === stub.userId
        ? Promise.resolve(null)
        : this.prisma.profile.findUnique({
            where: { userId: viewerUserId },
            select: { gender: true },
          }),
    ]);

    if (
      !this.isProfileVisibleWithRelationship(
        viewerUserId,
        stub,
        relationship.status,
        viewerProfile?.gender ?? null,
      )
    ) {
      throw new NotFoundException('Profile not found');
    }

    return stub;
  }

  async resolveProfileUserId(viewerUserId: string, profileIdOrCode: string) {
    const stub = await this.findProfileStubByIdOrCode(profileIdOrCode);
    if (!stub) {
      throw new NotFoundException('Profile not found');
    }

    const [relationship, viewerProfile] = await Promise.all([
      this.connections.getRelationshipSummary(viewerUserId, stub.userId),
      viewerUserId === stub.userId
        ? Promise.resolve(null)
        : this.prisma.profile.findUnique({
            where: { userId: viewerUserId },
            select: { gender: true },
          }),
    ]);

    if (
      !this.isProfileVisibleWithRelationship(
        viewerUserId,
        stub,
        relationship.status,
        viewerProfile?.gender ?? null,
      )
    ) {
      throw new NotFoundException('Profile not found');
    }

    return stub.userId;
  }

  async canViewerAccessProfile(
    viewerUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: targetUserId },
      select: { userId: true, gender: true, isVerified: true },
    });
    if (!profile) {
      return false;
    }
    return this.isProfileVisibleToViewer(viewerUserId, profile);
  }

  private async findProfileStubByIdOrCode(
    profileIdOrCode: string,
  ): Promise<ProfileStub | null> {
    const normalized = profileIdOrCode.trim();
    const profileCode = isValidProfileCode(normalized)
      ? normalizeProfileCode(normalized)
      : null;

    return this.prisma.profile.findFirst({
      where: {
        OR: [
          ...(profileCode ? [{ profileCode }] : []),
          { id: normalized },
        ],
      },
      select: profileStubSelect,
    });
  }

  private async findProfileByIdOrCode(profileIdOrCode: string) {
    const stub = await this.findProfileStubByIdOrCode(profileIdOrCode);
    if (!stub) {
      return null;
    }

    return this.prisma.profile.findFirst({
      where: { id: stub.id },
      include: profileInclude,
    });
  }

  private async findProfileForViewer(
    viewerUserId: string,
    profileIdOrCode: string,
  ) {
    const stub = await this.findProfileStubByIdOrCode(profileIdOrCode);
    if (!stub) {
      return null;
    }

    const [relationship, viewerProfile] = await Promise.all([
      this.connections.getRelationshipSummary(viewerUserId, stub.userId),
      viewerUserId === stub.userId
        ? Promise.resolve(null)
        : this.prisma.profile.findUnique({
            where: { userId: viewerUserId },
            select: { gender: true },
          }),
    ]);

    if (
      !this.isProfileVisibleWithRelationship(
        viewerUserId,
        stub,
        relationship.status,
        viewerProfile?.gender ?? null,
      )
    ) {
      return null;
    }

    return this.prisma.profile.findFirst({
      where: { id: stub.id },
      include: profileInclude,
    });
  }

  private isProfileVisibleWithRelationship(
    viewerUserId: string,
    profile: ProfileVisibilityInput,
    relationshipStatus:
      | 'none'
      | 'interest_sent'
      | 'interest_received'
      | 'connected'
      | 'self',
    viewerGender: string | null,
  ): boolean {
    if (profile.userId === viewerUserId) {
      return true;
    }

    if (
      relationshipStatus === 'connected' ||
      relationshipStatus === 'interest_sent' ||
      relationshipStatus === 'interest_received'
    ) {
      return true;
    }

    if (!profile.isVerified) {
      return false;
    }

    const oppositeGender = getOppositeGender(viewerGender);
    return oppositeGender !== null && profile.gender === oppositeGender;
  }

  private async isProfileVisibleToViewer(
    viewerUserId: string,
    profile: { userId: string; gender: string | null; isVerified: boolean },
  ): Promise<boolean> {
    if (profile.userId === viewerUserId) {
      return true;
    }

    const [relationship, viewerProfile] = await Promise.all([
      this.connections.getRelationshipSummary(viewerUserId, profile.userId),
      this.prisma.profile.findUnique({
        where: { userId: viewerUserId },
        select: { gender: true },
      }),
    ]);

    return this.isProfileVisibleWithRelationship(
      viewerUserId,
      profile,
      relationship.status,
      viewerProfile?.gender ?? null,
    );
  }

  async getHomeBootstrap(userId: string): Promise<MemberHomeBootstrapResponse> {
    const cached = this.homeBootstrapCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (
      cached &&
      cached.expiresAt + HOME_BOOTSTRAP_STALE_TTL_MS > Date.now()
    ) {
      void this.refreshHomeBootstrap(userId);
      return cached.value;
    }

    return this.loadHomeBootstrap(userId);
  }

  private refreshHomeBootstrap(userId: string) {
    void this.loadHomeBootstrap(userId);
  }

  private async loadHomeBootstrap(userId: string): Promise<MemberHomeBootstrapResponse> {
    const userTermsPromise = this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        termsAcceptedAt: true,
        termsVersion: true,
      },
    });
    const viewerProfilePromise = this.prisma.profile.findUnique({
      where: { userId: userId },
      include: { partnerPreference: true },
    });

    const [
      user,
      currentTermsVersion,
      profile,
      stats,
      suggestions,
    ] = await Promise.all([
      userTermsPromise,
      this.legal.getCurrentVersion(),
      this.profiles.getMemberHomeSummary(userId),
      this.connections.getMemberDiscoveryStats(userId),
      viewerProfilePromise.then((viewer) =>
        this.listProfiles(userId, 1, 3, {}, {
          candidatePoolLimit: DISCOVERY_HOME_SUGGESTION_POOL_LIMIT,
          lite: true,
          skipTotalCount: true,
          skipBookmarks: true,
          viewerProfile: viewer,
        }),
      ),
    ]);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (isStaffRole(user.role)) {
      throw new ForbiddenException('Staff accounts cannot use member home');
    }

    const termsAccepted = hasAcceptedCurrentTerms(
      user.termsAcceptedAt,
      user.termsVersion,
      currentTermsVersion,
    );

    const payload: MemberHomeBootstrapResponse = {
      termsAccepted,
      profile: {
        fullName: profile.fullName,
        profileCode: profile.profileCode,
        isVerified: profile.isVerified,
        completionPercent: profile.completionPercent,
        primaryPhotoId: profile.primaryPhotoId,
      },
      stats: {
        incoming: stats.incoming,
        outgoing: stats.outgoing,
        connections: stats.connections,
        conversations: stats.conversations,
      },
      suggestions: suggestions.items,
    };

    this.homeBootstrapCache.set(userId, {
      expiresAt: Date.now() + HOME_BOOTSTRAP_CACHE_TTL_MS,
      value: payload,
    });

    return payload;
  }

  private async loadPrivacyRules(): Promise<PrivacyRule[]> {
    return getCachedPrivacyRules(this.privacyFields);
  }
}
