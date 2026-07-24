import { PartnerPreference } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isFieldVisibleAtLevel,
  PROFILE_PRIVACY_FIELD_META,
  PROFILE_PRIVACY_FIELDS,
  resolveVisibleFullName,
} from '@easymatch/shared';
import {
  buildBidirectionalComparison,
  buildMaritalAlignmentComparison,
  type ComparisonCriterionKey,
  type ComparisonPartnerPreference,
  type ComparisonProfileAttributes,
  type MaritalAlignmentKey,
  type MaritalProfileSnapshot,
} from '@easymatch/shared';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import { type PrivacyRule } from '../privacy/profile-privacy-filter';
import { getCachedPrivacyRules } from '../privacy/privacy-rules-cache';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionsService } from './connections.service';
import { DiscoveryService } from './discovery.service';

/** Personal + partner privacy keys for the same comparison criterion (admin may configure either). */
const CRITERION_PRIVACY_FIELDS: Record<ComparisonCriterionKey, string[]> = {
  age: [
    PROFILE_PRIVACY_FIELDS.DATE_OF_BIRTH,
    PROFILE_PRIVACY_FIELDS.PARTNER_AGE_RANGE,
  ],
  height: [
    PROFILE_PRIVACY_FIELDS.HEIGHT,
    PROFILE_PRIVACY_FIELDS.PARTNER_HEIGHT_RANGE,
  ],
  weight: [
    PROFILE_PRIVACY_FIELDS.WEIGHT,
    PROFILE_PRIVACY_FIELDS.PARTNER_WEIGHT_RANGE,
  ],
  district: [
    PROFILE_PRIVACY_FIELDS.CURRENT_DISTRICT,
    PROFILE_PRIVACY_FIELDS.PARTNER_DISTRICTS,
  ],
  education: [
    PROFILE_PRIVACY_FIELDS.HIGHEST_DEGREE,
    PROFILE_PRIVACY_FIELDS.PARTNER_EDUCATION,
  ],
  profession: [
    PROFILE_PRIVACY_FIELDS.OCCUPATION,
    PROFILE_PRIVACY_FIELDS.PARTNER_PROFESSION,
  ],
  marital_status: [
    PROFILE_PRIVACY_FIELDS.MARITAL_STATUS,
    PROFILE_PRIVACY_FIELDS.PARTNER_MARITAL_STATUS,
  ],
  religion: [
    PROFILE_PRIVACY_FIELDS.RELIGION,
    PROFILE_PRIVACY_FIELDS.PARTNER_RELIGION,
  ],
  beard: [
    PROFILE_PRIVACY_FIELDS.HAS_BEARD,
    PROFILE_PRIVACY_FIELDS.PARTNER_BEARD_PREFERENCE,
  ],
  prayer: [
    PROFILE_PRIVACY_FIELDS.PRAYER_PRACTICE,
    PROFILE_PRIVACY_FIELDS.PARTNER_PRAYER_PREFERENCE,
  ],
  hijab: [
    PROFILE_PRIVACY_FIELDS.HIJAB_PRACTICE,
    PROFILE_PRIVACY_FIELDS.PARTNER_HIJAB_PREFERENCE,
  ],
};

const MARITAL_ALIGNMENT_PRIVACY_FIELDS: Record<MaritalAlignmentKey, string[]> = {
  expected_marriage_timeline: [
    PROFILE_PRIVACY_FIELDS.EXPECTED_MARRIAGE_TIMELINE,
  ],
  expected_parenthood_timeline: [
    PROFILE_PRIVACY_FIELDS.EXPECTED_PARENTHOOD_TIMELINE,
  ],
  wedding_ceremony_preference: [
    PROFILE_PRIVACY_FIELDS.WEDDING_CEREMONY_PREFERENCE,
  ],
  expected_kabin_amount: [
    PROFILE_PRIVACY_FIELDS.EXPECTED_KABIN_AMOUNT_MIN_BDT,
    PROFILE_PRIVACY_FIELDS.EXPECTED_KABIN_AMOUNT_MAX_BDT,
  ],
  living_arrangements: [PROFILE_PRIVACY_FIELDS.LIVING_ARRANGEMENTS],
};

type ComparisonProfile = {
  id: string;
  profileCode: string;
  userId: string;
  fullName: string | null;
  gender: string | null;
  religion: string | null;
  dateOfBirth: Date | null;
  heightCm: number | null;
  weightKg: number | null;
  currentDistrict: string | null;
  highestDegree: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  hasBeard: string | null;
  prayerPractice: string | null;
  hijabPractice: string | null;
  expectedMarriageTimeline: string | null;
  expectedParenthoodTimeline: string | null;
  weddingCeremonyPreference: string | null;
  livingArrangements: string | null;
  livingArrangementsOther: string | null;
  expectedKabinAmountMinBdt: number | null;
  expectedKabinAmountMaxBdt: number | null;
  isVerified: boolean;
  partnerPreference: PartnerPreference | null;
};

type ProfileComparisonPayload = Awaited<
  ReturnType<ComparisonService['buildProfileComparison']>
>;

const COMPARISON_CACHE_TTL_MS = 120_000;
const COMPARISON_PROFILE_CACHE_TTL_MS = 90_000;

@Injectable()
export class ComparisonService {
  private readonly comparisonCache = new Map<
    string,
    { expiresAt: number; value: ProfileComparisonPayload }
  >();
  private readonly comparisonInflight = new Map<
    string,
    Promise<ProfileComparisonPayload>
  >();
  private readonly comparisonProfileCache = new Map<
    string,
    { expiresAt: number; value: ComparisonProfile | null }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly discovery: DiscoveryService,
    private readonly connections: ConnectionsService,
    private readonly privacyFields: PrivacyFieldsService,
  ) {}

  async getProfileComparison(viewerUserId: string, profileIdOrCode: string) {
    const cacheKey = `${viewerUserId}:${profileIdOrCode}`;
    const cached = this.comparisonCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inflight = this.comparisonInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const request = this.buildProfileComparison(viewerUserId, profileIdOrCode)
      .then((value) => {
        this.comparisonCache.set(cacheKey, {
          expiresAt: Date.now() + COMPARISON_CACHE_TTL_MS,
          value,
        });
        return value;
      })
      .finally(() => {
        this.comparisonInflight.delete(cacheKey);
      });
    this.comparisonInflight.set(cacheKey, request);
    return request;
  }

  invalidateComparisonCache(
    viewerUserId: string,
    profileIdOrCode?: string,
  ) {
    if (profileIdOrCode) {
      const cacheKey = `${viewerUserId}:${profileIdOrCode}`;
      this.comparisonCache.delete(cacheKey);
      this.comparisonInflight.delete(cacheKey);
      return;
    }

    for (const key of this.comparisonCache.keys()) {
      if (key.startsWith(`${viewerUserId}:`)) {
        this.comparisonCache.delete(key);
      }
    }
    for (const key of this.comparisonInflight.keys()) {
      if (key.startsWith(`${viewerUserId}:`)) {
        this.comparisonInflight.delete(key);
      }
    }
  }

  private async buildProfileComparison(
    viewerUserId: string,
    profileIdOrCode: string,
  ) {
    const [target, viewerFull, rules] = await Promise.all([
      this.discovery.resolveBookmarkTarget(viewerUserId, profileIdOrCode),
      this.loadComparisonProfile(viewerUserId),
      getCachedPrivacyRules(this.privacyFields),
    ]);

    if (!viewerFull) {
      throw new NotFoundException('Your profile was not found');
    }

    if (target.userId === viewerUserId) {
      throw new BadRequestException('You cannot compare with your own profile');
    }

    const [otherFull, relationship] = await Promise.all([
      this.loadComparisonProfile(target.userId),
      this.connections.getRelationshipSummary(viewerUserId, target.userId),
    ]);

    if (!otherFull) {
      throw new NotFoundException('Profile not found');
    }

    const viewerLevelToOther = relationship.viewerPrivacyLevel;

    const fullNameRule = this.getFullNameRule(rules);
    const otherAttributeVisibility = this.buildCriterionVisibility(
      rules,
      viewerLevelToOther,
    );
    if (otherFull.dateOfBirth != null) {
      otherAttributeVisibility.age = true;
    }
    const otherPreferenceVisibility =
      this.buildCriterionVisibilityForPreferences(
        rules,
        viewerLevelToOther,
        otherFull.partnerPreference != null,
      );
    const otherPreferencesAvailable = otherFull.partnerPreference != null;

    const comparison = buildBidirectionalComparison({
      viewer: {
        preferences: this.mapFullPartnerPreferences(viewerFull.partnerPreference),
        attributes: this.toAttributes(viewerFull),
        gender: viewerFull.gender,
        religion: viewerFull.religion,
      },
      other: {
        preferences: this.mapFullPartnerPreferences(otherFull.partnerPreference),
        attributes: this.toAttributes(otherFull),
        gender: otherFull.gender,
        religion: otherFull.religion,
      },
      otherAttributeVisibility,
      otherPreferenceVisibility,
      otherPreferencesAvailable,
    });

    const otherMaritalVisibility = this.buildMaritalAlignmentVisibility(
      rules,
      viewerLevelToOther,
    );
    const maritalAlignment = buildMaritalAlignmentComparison({
      viewer: this.toMaritalSnapshot(viewerFull),
      other: this.toMaritalSnapshot(otherFull),
      viewerVisibility: Object.fromEntries(
        Object.keys(MARITAL_ALIGNMENT_PRIVACY_FIELDS).map((key) => [key, true]),
      ) as Partial<Record<MaritalAlignmentKey, boolean>>,
      otherVisibility: otherMaritalVisibility,
    });

    return {
      viewer: {
        profileId: viewerFull.id,
        profileCode: viewerFull.profileCode,
        fullName: viewerFull.fullName,
      },
      other: {
        profileId: otherFull.id,
        profileCode: otherFull.profileCode,
        fullName: resolveVisibleFullName(
          otherFull.fullName,
          viewerLevelToOther,
          fullNameRule,
        ),
        isVerified: otherFull.isVerified,
      },
      relationship,
      viewerPrivacyLevelToOther: viewerLevelToOther,
      otherPreferencesVisible: comparison.otherPreferencesVisible,
      mutualScore: comparison.mutualScore,
      viewerToOther: comparison.viewerToOther,
      otherToViewer: comparison.otherToViewer,
      maritalAlignment,
    };
  }

  private async loadComparisonProfile(
    userId: string,
  ): Promise<ComparisonProfile | null> {
    const cached = this.comparisonProfileCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { partnerPreference: true },
    });
    this.comparisonProfileCache.set(userId, {
      expiresAt: Date.now() + COMPARISON_PROFILE_CACHE_TTL_MS,
      value: profile,
    });
    return profile;
  }

  private getFullNameRule(rules: PrivacyRule[]) {
    const rule = rules.find(
      (row) => row.fieldKey === PROFILE_PRIVACY_FIELDS.FULL_NAME,
    );
    if (rule) {
      return {
        isShareable: rule.isShareable,
        minPrivacyLevel: rule.minPrivacyLevel,
      };
    }
    const meta = PROFILE_PRIVACY_FIELD_META[PROFILE_PRIVACY_FIELDS.FULL_NAME];
    return {
      isShareable: meta.defaultShareable,
      minPrivacyLevel: meta.defaultMinLevel,
    };
  }

  private toAttributes(profile: ComparisonProfile): ComparisonProfileAttributes {
    return {
      gender: profile.gender,
      religion: profile.religion,
      dateOfBirth: profile.dateOfBirth,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      currentDistrict: profile.currentDistrict,
      highestDegree: profile.highestDegree,
      occupation: profile.occupation,
      maritalStatus: profile.maritalStatus,
      hasBeard: profile.hasBeard,
      prayerPractice: profile.prayerPractice,
      hijabPractice: profile.hijabPractice,
    };
  }

  private toMaritalSnapshot(profile: ComparisonProfile): MaritalProfileSnapshot {
    return {
      gender: profile.gender,
      expectedMarriageTimeline: profile.expectedMarriageTimeline,
      expectedParenthoodTimeline: profile.expectedParenthoodTimeline,
      weddingCeremonyPreference: profile.weddingCeremonyPreference,
      livingArrangements: profile.livingArrangements,
      livingArrangementsOther: profile.livingArrangementsOther,
      expectedKabinAmountMinBdt: profile.expectedKabinAmountMinBdt,
      expectedKabinAmountMaxBdt: profile.expectedKabinAmountMaxBdt,
    };
  }

  private buildMaritalAlignmentVisibility(
    rules: PrivacyRule[],
    viewerLevel: number,
  ): Partial<Record<MaritalAlignmentKey, boolean>> {
    const ruleMap = new Map(rules.map((rule) => [rule.fieldKey, rule]));
    const result: Partial<Record<MaritalAlignmentKey, boolean>> = {};

    for (const [key, fieldKeys] of Object.entries(
      MARITAL_ALIGNMENT_PRIVACY_FIELDS,
    )) {
      result[key as MaritalAlignmentKey] = fieldKeys.some((fieldKey) => {
        const rule = ruleMap.get(fieldKey);
        if (!rule) return false;
        return isFieldVisibleAtLevel(
          rule.isShareable,
          rule.minPrivacyLevel,
          viewerLevel,
        );
      });
    }

    return result;
  }

  private mapFullPartnerPreferences(
    pref: PartnerPreference | null | undefined,
  ): ComparisonPartnerPreference | null {
    if (!pref) {
      return null;
    }

    return {
      ageMin: pref.ageMin,
      ageMax: pref.ageMax,
      heightMinCm: pref.heightMinCm,
      heightMaxCm: pref.heightMaxCm,
      weightMinKg: pref.weightMinKg,
      weightMaxKg: pref.weightMaxKg,
      preferredDistricts: pref.preferredDistricts ?? [],
      minimumEducation: pref.minimumEducation,
      preferredProfession: pref.preferredProfession ?? [],
      preferredReligion: pref.preferredReligion ?? null,
      beardPreference: pref.beardPreference,
      prayerPreference: pref.prayerPreference,
      hijabPreference: pref.hijabPreference,
      maritalStatusPref: pref.maritalStatusPref ?? [],
    };
  }

  private buildCriterionVisibility(
    rules: PrivacyRule[],
    viewerLevel: number,
  ): Partial<Record<ComparisonCriterionKey, boolean>> {
    const ruleMap = new Map(rules.map((rule) => [rule.fieldKey, rule]));
    const result: Partial<Record<ComparisonCriterionKey, boolean>> = {};

    for (const [key, fieldKeys] of Object.entries(CRITERION_PRIVACY_FIELDS)) {
      result[key as ComparisonCriterionKey] = fieldKeys.some((fieldKey) => {
        const rule = ruleMap.get(fieldKey);
        if (!rule) return false;
        return isFieldVisibleAtLevel(
          rule.isShareable,
          rule.minPrivacyLevel,
          viewerLevel,
        );
      });
    }

    return result;
  }

  private buildCriterionVisibilityForPreferences(
    rules: PrivacyRule[],
    viewerLevel: number,
    hasPartnerPreference: boolean,
  ): Partial<Record<ComparisonCriterionKey, boolean>> {
    if (!hasPartnerPreference) {
      return Object.fromEntries(
        Object.keys(CRITERION_PRIVACY_FIELDS).map((key) => [key, false]),
      ) as Partial<Record<ComparisonCriterionKey, boolean>>;
    }

    return this.buildCriterionVisibility(rules, viewerLevel);
  }
}
