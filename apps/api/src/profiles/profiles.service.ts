import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { MediaReviewStatus, Prisma } from '@prisma/client';
import {
  feetInchesToCm,
  isBangladeshAddress,
  isIslamReligion,
  isOnBehalfProfile,
  isValidDisplayDate,
  displayDateToIso,
  NID_DOCUMENT_SUBJECTS,
  ON_BEHALF_RELATIONS,
  PROFILE_CREATION_MODES,
  showBeardPreferenceField,
  showHasBeardField,
  showHijabPracticeField,
  showSmokingHabitField,
  MALE_GENDER_VALUE,
  showHijabPreferenceField,
  showPrayerPreferenceField,
  normalizeHijabPreference,
  showDowryExpectationField,
  showLivingArrangementsOtherField,
  isValidLivingArrangementsForGender,
  LIVING_ARRANGEMENTS_OTHER_MALE_VALUE,
} from '@easymatch/shared';
import { generateUniqueProfileCode } from './profile-code.util';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import { StaffNotificationService } from '../staff/staff-notification.service';
import {
  buildVisibleProfileView,
  type PrivacyRule,
} from '../privacy/profile-privacy-filter';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { UpdateMaritalDto } from './dto/update-marital.dto';
import { SetCreationIntentDto } from './dto/set-creation-intent.dto';

const profileInclude = {
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
  photos: { orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
  nidDocuments: true,
} satisfies Prisma.ProfileInclude;

const biodataExportInclude = {
  user: { select: { phone: true } },
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
  photos: true,
  nidDocuments: true,
} satisfies Prisma.ProfileInclude;

const completionInclude = {
  familyInfo: { select: { fatherProfession: true, motherProfession: true } },
  partnerPreference: { select: { ageMin: true } },
  photos: { select: { id: true, type: true } },
  nidDocuments: { select: { side: true, subject: true } },
} satisfies Prisma.ProfileInclude;

type CompletionProfile = Prisma.ProfileGetPayload<{
  include: typeof completionInclude;
}>;

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly privacyFields: PrivacyFieldsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly staffNotifications: StaffNotificationService,
  ) {}

  async getCompletionSummary(userId: string) {
    const profile = await this.ensureProfileForCompletion(userId);
    return this.calculateCompletion(profile);
  }

  invalidateMemberProfileCaches(userId: string) {
    this.authService.clearEditorBootstrapCache(userId);
    this.authService.clearFullProfileCache(userId);
  }

  async getMemberHomeSummary(userId: string) {
    const profile = await this.ensureProfileForCompletion(userId);
    const primaryPhoto = profile.photos.find((photo) => photo.type === 'primary');
    return {
      fullName: profile.fullName,
      profileCode: profile.profileCode,
      isVerified: profile.isVerified,
      primaryPhotoId: primaryPhoto?.id ?? null,
      ...this.calculateCompletion(profile),
    };
  }

  async setCreationIntent(userId: string, dto: SetCreationIntentDto) {
    const profile = await this.ensureProfile(userId);

    if (profile.creationMode) {
      this.authService.clearEditorBootstrapCache(userId);
      return this.getMyProfile(userId);
    }

    if (dto.creationMode === 'on_behalf' && !dto.onBehalfRelation) {
      throw new BadRequestException(
        'On-behalf relation is required when creating a profile for someone else',
      );
    }

    if (
      dto.onBehalfRelation &&
      !ON_BEHALF_RELATIONS.includes(dto.onBehalfRelation)
    ) {
      throw new BadRequestException('Invalid on-behalf relation');
    }

    if (!PROFILE_CREATION_MODES.includes(dto.creationMode)) {
      throw new BadRequestException('Invalid profile creation mode');
    }

    const updated = await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        creationMode: dto.creationMode,
        onBehalfRelation:
          dto.creationMode === 'on_behalf' ? dto.onBehalfRelation : null,
      },
      include: profileInclude,
    });

    const { photos, nidDocuments, ...rest } = updated;
    this.authService.clearEditorBootstrapCache(userId);
    return {
      ...rest,
      photos: photos.map((photo) => ({
        id: photo.id,
        type: photo.type,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        sortOrder: photo.sortOrder,
        status: photo.status,
        createdAt: photo.createdAt.toISOString(),
      })),
      nidDocuments: nidDocuments.map((doc) => ({
        id: doc.id,
        side: doc.side,
        subject: doc.subject,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        status: doc.status,
        submittedAt: doc.submittedAt.toISOString(),
        reviewedAt: doc.reviewedAt?.toISOString() ?? null,
      })),
      nidStatus: this.resolveNidStatus(updated),
      ...this.calculateCompletion(updated),
    };
  }

  async exportBiodataAtLevel(userId: string, level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 3) {
      throw new BadRequestException('level must be 0, 1, 2, or 3');
    }

    const [profile, rules] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { userId },
        include: biodataExportInclude,
      }),
      this.loadPrivacyRules(),
    ]);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const view = buildVisibleProfileView(profile, rules, level);

    return {
      profileCode: profile.profileCode,
      privacyLevel: level,
      generatedAt: new Date().toISOString(),
      personal: view.personal,
      marital: view.marital,
      family: view.family,
      siblings: view.siblings,
      paternalRelatives: view.paternalRelatives,
      maternalRelatives: view.maternalRelatives,
      partner: view.partner,
      media: view.media,
      hiddenFieldCount: view.hiddenFieldCount,
    };
  }

  async getMyProfile(userId: string) {
    const profile = await this.ensureProfile(userId);
    const { photos, nidDocuments, ...rest } = profile;
    return {
      ...rest,
      photos: photos.map((photo) => ({
        id: photo.id,
        type: photo.type,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        sortOrder: photo.sortOrder,
        status: photo.status,
        createdAt: photo.createdAt.toISOString(),
      })),
      nidDocuments: nidDocuments.map((doc) => ({
        id: doc.id,
        side: doc.side,
        subject: doc.subject,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        status: doc.status,
        submittedAt: doc.submittedAt.toISOString(),
        reviewedAt: doc.reviewedAt?.toISOString() ?? null,
      })),
      nidStatus: this.resolveNidStatus(profile),
      ...this.calculateCompletion(profile),
    };
  }

  async updatePersonal(userId: string, dto: UpdatePersonalDto) {
    const profile = await this.ensureProfile(userId);

    if (profile.nidVerifiedAt && dto.fullName !== undefined) {
      const nextName = dto.fullName.trim();
      const currentName = (profile.fullName ?? '').trim();
      if (nextName !== currentName) {
        throw new ForbiddenException(
          'Full name cannot be changed after NID verification',
        );
      }
    }

    const data: Prisma.ProfileUpdateInput = {
      gender: dto.gender,
      maritalStatus: dto.maritalStatus,
      divorceDetails: dto.divorceDetails,
      weightKg: dto.weightKg,
      complexion: dto.complexion,
      hasDisability: dto.hasDisability,
      disabilityInfo: dto.disabilityInfo,
      religion: dto.religion,
      educationMedium: dto.educationMedium,
      highestDegree: dto.highestDegree,
      additionalEducationQualifications: dto.additionalEducationQualifications,
      institution: dto.institution,
      educationYear: dto.educationYear,
      educationSubject: dto.educationSubject,
      occupation: dto.occupation,
      company: dto.company,
      designation: dto.designation,
      monthlyIncomeRange: dto.monthlyIncomeRange,
      currentCountry: dto.currentCountry,
      currentDivision: dto.currentDivision,
      currentDistrict: dto.currentDistrict,
      currentUpazila: dto.currentUpazila,
      currentCityTown: dto.currentCityTown,
      currentAddressLine: dto.currentAddressLine,
      permanentSameAsCurrent: dto.permanentSameAsCurrent,
      biography: dto.biography,
      hobbies: dto.hobbies,
      interests: dto.interests,
      introduction: dto.introduction,
    };

    if (!profile.nidVerifiedAt && dto.fullName !== undefined) {
      data.fullName = dto.fullName;
    }

    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = this.parseBirthDate(dto.dateOfBirth);
    }

    if (dto.heightUnit !== undefined) {
      data.heightUnit = dto.heightUnit;
    }

    const resolvedHeight = this.resolveHeightCm(
      dto.heightUnit ?? 'ft_in',
      dto.heightCm,
      dto.heightFeet,
      dto.heightInches,
    );
    if (resolvedHeight !== undefined) {
      data.heightCm = resolvedHeight;
      data.heightUnit = dto.heightUnit ?? 'ft_in';
    }

    if (dto.permanentSameAsCurrent) {
      data.permanentCountry = dto.currentCountry;
      data.permanentDivision = dto.currentDivision;
      data.permanentDistrict = dto.currentDistrict;
      data.permanentUpazila = dto.currentUpazila;
      data.permanentCityTown = dto.currentCityTown;
      data.permanentAddressLine = dto.currentAddressLine;
    } else {
      data.permanentCountry = dto.permanentCountry;
      data.permanentDivision = dto.permanentDivision;
      data.permanentDistrict = dto.permanentDistrict;
      data.permanentUpazila = dto.permanentUpazila;
      data.permanentCityTown = dto.permanentCityTown;
      data.permanentAddressLine = dto.permanentAddressLine;
    }

    const resolvedCurrentCountry =
      dto.currentCountry !== undefined
        ? dto.currentCountry
        : profile.currentCountry;
    const resolvedPermanentCountry = dto.permanentSameAsCurrent
      ? resolvedCurrentCountry
      : dto.permanentCountry !== undefined
        ? dto.permanentCountry
        : profile.permanentCountry ?? profile.currentCountry;

    if (!isBangladeshAddress(resolvedCurrentCountry)) {
      data.currentDistrict = null;
      data.currentUpazila = null;
    }

    if (!isBangladeshAddress(resolvedPermanentCountry)) {
      data.permanentDistrict = null;
      data.permanentUpazila = null;
    }

    const religion =
      dto.religion !== undefined ? dto.religion : profile.religion;
    const gender = dto.gender !== undefined ? dto.gender : profile.gender;
    const maritalStatus =
      dto.maritalStatus !== undefined
        ? dto.maritalStatus
        : profile.maritalStatus;

    if (maritalStatus === 'divorced') {
      if (dto.divorceDetails !== undefined) {
        data.divorceDetails = dto.divorceDetails.trim() || null;
      }
    } else {
      data.divorceDetails = null;
    }

    if (maritalStatus === 'divorced' || maritalStatus === 'widowed') {
      if (dto.childrenCount !== undefined) {
        data.childrenCount = dto.childrenCount;
      }
    } else {
      data.childrenCount = null;
    }

    if (dto.hasBeard !== undefined && showHasBeardField(religion, gender)) {
      data.hasBeard = dto.hasBeard.trim() || null;
    }
    if (dto.prayerPractice !== undefined && isIslamReligion(religion)) {
      data.prayerPractice = dto.prayerPractice.trim() || null;
    }
    if (dto.hijabPractice !== undefined && showHijabPracticeField(religion, gender)) {
      data.hijabPractice = dto.hijabPractice.trim() || null;
    }
    if (dto.smokingHabit !== undefined && showSmokingHabitField(gender)) {
      data.smokingHabit = dto.smokingHabit.trim() || null;
    }

    if (!isIslamReligion(religion)) {
      data.prayerPractice = null;
      data.hasBeard = null;
      data.hijabPractice = null;
    } else {
      if (!this.isFilled(data.prayerPractice ?? profile.prayerPractice)) {
        throw new BadRequestException(
          'Prayer practice is required when religion is Islam',
        );
      }
      if (!showHasBeardField(religion, gender)) {
        data.hasBeard = null;
      }
      if (!showHijabPracticeField(religion, gender)) {
        data.hijabPractice = null;
      }
    }

    if (gender !== MALE_GENDER_VALUE) {
      data.smokingHabit = null;
    } else if (!this.isFilled(data.smokingHabit ?? profile.smokingHabit)) {
      throw new BadRequestException(
        'Smoking habit is required for male profiles',
      );
    }

    if (dto.gender !== undefined && dto.gender !== profile.gender) {
      this.applyMaritalGenderReset(data, dto.gender, profile);
    }

    const updated = await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        ...this.omitUndefined(data),
        ...this.biodataResetData(profile),
      },
      include: profileInclude,
    });

    await this.clearInapplicablePartnerIslamFields(
      profile.id,
      updated.religion,
      updated.gender,
    );

    const refreshed = await this.prisma.profile.findUniqueOrThrow({
      where: { id: profile.id },
      include: profileInclude,
    });

    this.invalidateMemberProfileCaches(userId);
    return {
      ...refreshed,
      ...this.calculateCompletion(refreshed),
    };
  }

  async updateMarital(userId: string, dto: UpdateMaritalDto) {
    const profile = await this.ensureProfile(userId);
    const gender = profile.gender;
    const data: Prisma.ProfileUpdateInput = {};

    if (dto.expectedMarriageTimeline !== undefined) {
      data.expectedMarriageTimeline =
        dto.expectedMarriageTimeline.trim() || null;
    }
    if (dto.weddingCeremonyPreference !== undefined) {
      data.weddingCeremonyPreference =
        dto.weddingCeremonyPreference.trim() || null;
    }
    if (dto.expectedParenthoodTimeline !== undefined) {
      data.expectedParenthoodTimeline =
        dto.expectedParenthoodTimeline.trim() || null;
    }

    if (dto.dowryExpectation !== undefined) {
      if (showDowryExpectationField(gender)) {
        data.dowryExpectation = dto.dowryExpectation.trim() || null;
      } else {
        data.dowryExpectation = null;
      }
    }

    if (dto.livingArrangements !== undefined) {
      const value = dto.livingArrangements.trim();
      if (value && !isValidLivingArrangementsForGender(gender, value)) {
        throw new BadRequestException(
          'Living arrangements option is not valid for this gender',
        );
      }
      data.livingArrangements = value || null;
      if (value !== LIVING_ARRANGEMENTS_OTHER_MALE_VALUE) {
        data.livingArrangementsOther = null;
      }
    }

    if (dto.livingArrangementsOther !== undefined) {
      const living =
        dto.livingArrangements !== undefined
          ? dto.livingArrangements.trim()
          : profile.livingArrangements;
      if (showLivingArrangementsOtherField(gender, living)) {
        data.livingArrangementsOther =
          dto.livingArrangementsOther.trim() || null;
      } else {
        data.livingArrangementsOther = null;
      }
    }

    const nextKabinMin =
      dto.expectedKabinAmountMinBdt !== undefined
        ? dto.expectedKabinAmountMinBdt
        : profile.expectedKabinAmountMinBdt;
    const nextKabinMax =
      dto.expectedKabinAmountMaxBdt !== undefined
        ? dto.expectedKabinAmountMaxBdt
        : profile.expectedKabinAmountMaxBdt;
    if (
      nextKabinMin != null &&
      nextKabinMax != null &&
      nextKabinMin > nextKabinMax
    ) {
      throw new BadRequestException(
        'Lowest expected kabin amount cannot exceed highest expected amount',
      );
    }
    if (dto.expectedKabinAmountMinBdt !== undefined) {
      data.expectedKabinAmountMinBdt = dto.expectedKabinAmountMinBdt;
    }
    if (dto.expectedKabinAmountMaxBdt !== undefined) {
      data.expectedKabinAmountMaxBdt = dto.expectedKabinAmountMaxBdt;
    }

    if (!showDowryExpectationField(gender)) {
      data.dowryExpectation = null;
    }

    const livingValue =
      (typeof data.livingArrangements === 'string'
        ? data.livingArrangements
        : undefined) ?? profile.livingArrangements;
    if (
      livingValue &&
      gender &&
      !isValidLivingArrangementsForGender(gender, livingValue)
    ) {
      data.livingArrangements = null;
      data.livingArrangementsOther = null;
    }

    await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        ...this.omitUndefined(data),
        ...this.biodataResetData(profile),
      },
    });

    await this.markBiodataPendingAfterProfileEdit(profile);

    const updated = await this.prisma.profile.findUniqueOrThrow({
      where: { id: profile.id },
      include: profileInclude,
    });

    this.invalidateMemberProfileCaches(userId);
    return {
      ...updated,
      ...this.calculateCompletion(updated),
    };
  }

  private applyMaritalGenderReset(
    data: Prisma.ProfileUpdateInput,
    gender: string | null,
    profile: { livingArrangements: string | null },
  ) {
    if (!showDowryExpectationField(gender)) {
      data.dowryExpectation = null;
    }
    const living = profile.livingArrangements;
    if (living && gender && !isValidLivingArrangementsForGender(gender, living)) {
      data.livingArrangements = null;
      data.livingArrangementsOther = null;
    } else if (!showLivingArrangementsOtherField(gender, living)) {
      data.livingArrangementsOther = null;
    }
  }

  async updateFamily(userId: string, dto: UpdateFamilyDto) {
    const profile = await this.ensureProfile(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.familyInfo.upsert({
        where: { profileId: profile.id },
        create: {
          profileId: profile.id,
          fatherName: dto.fatherName,
          fatherIsAlive:
            dto.fatherIsAlive !== undefined
              ? dto.fatherIsAlive.trim() || null
              : undefined,
          fatherEducation: dto.fatherEducation,
          fatherProfession: dto.fatherProfession,
          motherName: dto.motherName,
          motherIsAlive:
            dto.motherIsAlive !== undefined
              ? dto.motherIsAlive.trim() || null
              : undefined,
          motherEducation: dto.motherEducation,
          motherProfession: dto.motherProfession,
          familyType: dto.familyType,
          familyStatus: dto.familyStatus,
          familyValues: dto.familyValues,
          familyAssets: dto.familyAssets,
        },
        update: {
          fatherName: dto.fatherName,
          fatherIsAlive:
            dto.fatherIsAlive !== undefined
              ? dto.fatherIsAlive.trim() || null
              : undefined,
          fatherEducation: dto.fatherEducation,
          fatherProfession: dto.fatherProfession,
          motherName: dto.motherName,
          motherIsAlive:
            dto.motherIsAlive !== undefined
              ? dto.motherIsAlive.trim() || null
              : undefined,
          motherEducation: dto.motherEducation,
          motherProfession: dto.motherProfession,
          familyType: dto.familyType,
          familyStatus: dto.familyStatus,
          familyValues: dto.familyValues,
          familyAssets: dto.familyAssets,
        },
      });

      if (dto.siblings !== undefined) {
        await tx.sibling.deleteMany({ where: { profileId: profile.id } });
        if (dto.siblings.length > 0) {
          await tx.sibling.createMany({
            data: dto.siblings.map((s) => ({
              profileId: profile.id,
              relationship: s.relationship,
              name: s.name?.trim() || null,
              education: s.education,
              profession: s.profession,
              maritalStatus: s.maritalStatus,
              spouseName: s.maritalStatus === 'married' ? s.spouseName : null,
              spouseEducation:
                s.maritalStatus === 'married' ? s.spouseEducation : null,
              spouseProfession:
                s.maritalStatus === 'married' ? s.spouseProfession : null,
            })),
          });
        }
      }

      if (dto.paternalRelatives !== undefined) {
        await tx.paternalRelative.deleteMany({ where: { profileId: profile.id } });
        if (dto.paternalRelatives.length > 0) {
          await tx.paternalRelative.createMany({
            data: dto.paternalRelatives.map((relative) => ({
              profileId: profile.id,
              relation: relative.relation,
              name: relative.name?.trim() || null,
              education: relative.education,
              profession: relative.profession,
            })),
          });
        }
      }

      if (dto.maternalRelatives !== undefined) {
        await tx.maternalRelative.deleteMany({ where: { profileId: profile.id } });
        if (dto.maternalRelatives.length > 0) {
          await tx.maternalRelative.createMany({
            data: dto.maternalRelatives.map((relative) => ({
              profileId: profile.id,
              relation: relative.relation,
              name: relative.name?.trim() || null,
              education: relative.education,
              profession: relative.profession,
            })),
          });
        }
      }
    });

    await this.markBiodataPendingAfterProfileEdit(profile);

    const updated = await this.prisma.profile.findUniqueOrThrow({
      where: { id: profile.id },
      include: profileInclude,
    });

    this.invalidateMemberProfileCaches(userId);
    return {
      ...updated,
      ...this.calculateCompletion(updated),
    };
  }

  async updatePartner(userId: string, dto: UpdatePartnerDto) {
    const profile = await this.ensureProfile(userId);

    if (
      dto.ageMin !== undefined &&
      dto.ageMax !== undefined &&
      dto.ageMin > dto.ageMax
    ) {
      throw new BadRequestException('Minimum age cannot exceed maximum age');
    }

    const heightUnit = dto.heightUnit ?? 'ft_in';
    const heightMinCm = this.resolveHeightCm(
      heightUnit,
      dto.heightMinCm,
      dto.heightMinFeet,
      dto.heightMinInches,
    );
    const heightMaxCm = this.resolveHeightCm(
      heightUnit,
      dto.heightMaxCm,
      dto.heightMaxFeet,
      dto.heightMaxInches,
    );

    if (
      heightMinCm !== undefined &&
      heightMaxCm !== undefined &&
      heightMinCm > heightMaxCm
    ) {
      throw new BadRequestException('Minimum height cannot exceed maximum height');
    }

    const partnerData: Record<string, unknown> = {
      ageMin: dto.ageMin,
      ageMax: dto.ageMax,
      heightUnit,
      heightMinCm,
      heightMaxCm,
      weightMinKg: dto.weightMinKg,
      weightMaxKg: dto.weightMaxKg,
      preferredDistricts: dto.preferredDistricts ?? [],
      minimumEducation: dto.minimumEducation,
      preferredProfession: dto.preferredProfession,
      preferredReligion: null,
      maritalStatusPref: dto.maritalStatusPref ?? [],
      additionalNotes: dto.additionalNotes,
    };

    if (dto.beardPreference !== undefined) {
      partnerData.beardPreference = dto.beardPreference.trim() || null;
    }
    if (dto.prayerPreference !== undefined) {
      partnerData.prayerPreference = dto.prayerPreference.trim() || null;
    }
    if (dto.hijabPreference !== undefined) {
      const trimmed = dto.hijabPreference.trim();
      partnerData.hijabPreference =
        normalizeHijabPreference(trimmed) ?? (trimmed || null);
    }

    if (!isIslamReligion(profile.religion)) {
      partnerData.prayerPreference = null;
      partnerData.beardPreference = null;
      partnerData.hijabPreference = null;
    } else {
      if (!showBeardPreferenceField(profile.religion, profile.gender)) {
        partnerData.beardPreference = null;
      }
      if (!showHijabPreferenceField(profile.religion, profile.gender)) {
        partnerData.hijabPreference = null;
      }
    }

    const cleanedPartnerData = Object.fromEntries(
      Object.entries(partnerData).filter(([, v]) => v !== undefined),
    );

    const updated = await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        ...this.biodataResetData(profile),
        partnerPreference: {
          upsert: {
            create: cleanedPartnerData,
            update: cleanedPartnerData,
          },
        },
      },
      include: profileInclude,
    });

    this.invalidateMemberProfileCaches(userId);
    return {
      ...updated,
      ...this.calculateCompletion(updated),
    };
  }

  private async clearInapplicablePartnerIslamFields(
    profileId: string,
    religion: string | null,
    gender: string | null,
  ) {
    const data: Prisma.PartnerPreferenceUpdateManyMutationInput = {
      preferredReligion: null,
    };

    if (!isIslamReligion(religion)) {
      data.prayerPreference = null;
      data.beardPreference = null;
      data.hijabPreference = null;
    } else {
      if (!showBeardPreferenceField(religion, gender)) {
        data.beardPreference = null;
      }
      if (!showHijabPreferenceField(religion, gender)) {
        data.hijabPreference = null;
      }
    }

    await this.prisma.partnerPreference.updateMany({
      where: { profileId },
      data,
    });
  }

  private biodataResetData(_profile: {
    profileBiodataReviewStatus: MediaReviewStatus | null;
  }): Prisma.ProfileUpdateInput {
    // Biodata edits do not re-enter review until the member submits from Photos & Verification.
    return {};
  }

  private async markBiodataPendingAfterProfileEdit(_profile: {
    id: string;
    profileCode: string;
    profileBiodataReviewStatus: MediaReviewStatus | null;
  }) {
    // Saved biodata edits do not enter review until the member submits from Photos & Verification.
  }

  private resolveHeightCm(
    unit: 'cm' | 'ft_in' | undefined,
    cm?: number,
    feet?: number,
    inches?: number,
  ): number | undefined {
    if (unit === 'ft_in') {
      if (feet === undefined || inches === undefined) return undefined;
      return feetInchesToCm(feet, inches);
    }
    return cm;
  }

  private async ensureProfileForCompletion(userId: string) {
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: completionInclude,
    });

    if (!profile) {
      const profileCode = await generateUniqueProfileCode(this.prisma);
      profile = await this.prisma.profile.create({
        data: { userId, profileCode },
        include: completionInclude,
      });
    }

    return profile;
  }

  private async ensureProfile(userId: string) {
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: profileInclude,
    });

    if (!profile) {
      const profileCode = await generateUniqueProfileCode(this.prisma);
      profile = await this.prisma.profile.create({
        data: { userId, profileCode },
        include: profileInclude,
      });
    }

    return profile;
  }

  private resolveNidStatus(
    profile: Prisma.ProfileGetPayload<{ include: typeof profileInclude }>,
    subject: 'member' | 'creator' = 'member',
  ): 'not_submitted' | 'pending' | 'verified' | 'rejected' {
    const verifiedAt =
      subject === 'creator'
        ? profile.creatorNidVerifiedAt
        : profile.nidVerifiedAt;
    const documents = profile.nidDocuments.filter((doc) => doc.subject === subject);

    if (verifiedAt) return 'verified';
    if (documents.length === 0) return 'not_submitted';
    if (documents.some((doc) => doc.status === 'rejected')) {
      return 'rejected';
    }
    if (
      documents.some((doc) => doc.side === 'front') &&
      documents.some((doc) => doc.side === 'back')
    ) {
      return 'pending';
    }
    return 'not_submitted';
  }

  private calculateCompletion(
    profile: CompletionProfile,
  ): { completionPercent: number; completionMissing: string[] } {
    const currentIsBangladesh = isBangladeshAddress(profile.currentCountry);
    const permanentIsBangladesh = profile.permanentSameAsCurrent
      ? currentIsBangladesh
      : isBangladeshAddress(profile.permanentCountry ?? profile.currentCountry);

    const currentAddressFilled = currentIsBangladesh
      ? this.isFilled(profile.currentDivision) &&
        this.isFilled(profile.currentDistrict)
      : this.isFilled(profile.currentCityTown) &&
        this.isFilled(profile.currentAddressLine);

    const permanentAddressFilled = profile.permanentSameAsCurrent
      ? currentAddressFilled
      : permanentIsBangladesh
        ? this.isFilled(profile.permanentDivision) &&
          this.isFilled(profile.permanentDistrict)
        : this.isFilled(profile.permanentCityTown) &&
          this.isFilled(profile.permanentAddressLine);

    const hasNidSide = (
      side: 'front' | 'back',
      subject: 'member' | 'creator' = 'member',
    ) =>
      profile.nidDocuments.some(
        (doc) => doc.side === side && doc.subject === subject,
      );

    const onBehalf = isOnBehalfProfile(profile);

    const checks: { key: string; filled: boolean }[] = [
      { key: 'gender', filled: this.isFilled(profile.gender) },
      { key: 'dateOfBirth', filled: this.isFilled(profile.dateOfBirth) },
      { key: 'maritalStatus', filled: this.isFilled(profile.maritalStatus) },
      { key: 'religion', filled: this.isFilled(profile.religion) },
      ...(currentIsBangladesh
        ? [
            {
              key: 'currentDivision',
              filled: this.isFilled(profile.currentDivision),
            },
            {
              key: 'currentDistrict',
              filled: this.isFilled(profile.currentDistrict),
            },
          ]
        : [
            {
              key: 'currentCityTown',
              filled: this.isFilled(profile.currentCityTown),
            },
            {
              key: 'currentAddressLine',
              filled: this.isFilled(profile.currentAddressLine),
            },
          ]),
      ...(profile.permanentSameAsCurrent
        ? [
            {
              key: permanentIsBangladesh
                ? 'permanentDistrict'
                : 'permanentAddressLine',
              filled: permanentAddressFilled,
            },
          ]
        : permanentIsBangladesh
          ? [
              {
                key: 'permanentDistrict',
                filled: permanentAddressFilled,
              },
            ]
          : [
              {
                key: 'permanentCityTown',
                filled: this.isFilled(profile.permanentCityTown),
              },
              {
                key: 'permanentAddressLine',
                filled: this.isFilled(profile.permanentAddressLine),
              },
            ]),
      { key: 'introduction', filled: this.isFilled(profile.introduction) },
      { key: 'educationMedium', filled: this.isFilled(profile.educationMedium) },
      { key: 'highestDegree', filled: this.isFilled(profile.highestDegree) },
      { key: 'occupation', filled: this.isFilled(profile.occupation) },
      {
        key: 'fatherProfession',
        filled: this.isFilled(profile.familyInfo?.fatherProfession),
      },
      {
        key: 'motherProfession',
        filled: this.isFilled(profile.familyInfo?.motherProfession),
      },
      {
        key: 'ageMin',
        filled: this.isFilled(profile.partnerPreference?.ageMin),
      },
      {
        key: 'primaryPhoto',
        filled: profile.photos.some((photo) => photo.type === 'primary'),
      },
    ];

    if (onBehalf) {
      checks.push(
        { key: 'creatorNidFront', filled: hasNidSide('front', 'creator') },
        { key: 'creatorNidBack', filled: hasNidSide('back', 'creator') },
      );
    } else {
      checks.push(
        { key: 'nidFront', filled: hasNidSide('front', 'member') },
        { key: 'nidBack', filled: hasNidSide('back', 'member') },
      );
    }

    if (isIslamReligion(profile.religion)) {
      checks.push({
        key: 'prayerPractice',
        filled: this.isFilled(profile.prayerPractice),
      });
    }

    if (profile.gender === MALE_GENDER_VALUE) {
      checks.push({
        key: 'smokingHabit',
        filled: this.isFilled(profile.smokingHabit),
      });
    }

    const filledCount = checks.filter((item) => item.filled).length;

    return {
      completionPercent: Math.round((filledCount / checks.length) * 100),
      completionMissing: checks
        .filter((item) => !item.filled)
        .map((item) => item.key),
    };
  }

  private isFilled(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  private parseBirthDate(raw: string): Date {
    const trimmed = raw.trim();
    let iso: string | null = null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      iso = trimmed;
    } else if (isValidDisplayDate(trimmed)) {
      iso = displayDateToIso(trimmed);
    }

    if (!iso) {
      throw new BadRequestException(
        'Invalid date of birth. Use DD/MM/YYYY format.',
      );
    }

    const parsed = new Date(`${iso}T00:00:00.000Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== iso
    ) {
      throw new BadRequestException(
        'Invalid date of birth. Use DD/MM/YYYY format.',
      );
    }
    return parsed;
  }

  private omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private async loadPrivacyRules(): Promise<PrivacyRule[]> {
    const rows = await this.privacyFields.listAll();
    return rows.map((row) => ({
      fieldKey: row.fieldKey,
      isShareable: row.isShareable,
      minPrivacyLevel: row.minPrivacyLevel,
    }));
  }
}
