import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  MediaReviewStatus,
  NidDocumentSide,
  NidDocumentSubject,
  Prisma,
  ProfilePhotoType,
  VerificationAlertType,
} from '@prisma/client';
import {
  buildVerificationBiodataChanges,
  isOnBehalfProfile,
} from '@easymatch/shared';
import { AuthService } from '../auth/auth.service';
import {
  MEMBER_INCOMING_PUSH,
  PUSH_CHANNEL_VERIFICATION,
  PushNotificationService,
} from '../push/push-notification.service';
import {
  biodataAuditExportInclude,
  buildAuditBiodataExport,
} from '../profiles/biodata-audit-export';
import { MediaService } from '../profiles/media.service';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { VerificationAlertsService } from './verification-alerts.service';
import {
  buildVerificationBiodataSnapshotFromProfile,
  parseStoredVerificationBiodataSnapshot,
} from './verification-biodata-snapshot';
import {
  isNidReadyForReview,
  isProfileFullyVerified,
} from './verification-status';

const submissionInclude = {
  user: {
    select: { id: true, phone: true, phoneVerifiedAt: true, isActive: true },
  },
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
  photos: { orderBy: [{ type: 'asc' as const }, { sortOrder: 'asc' as const }] },
  nidDocuments: { orderBy: { side: 'asc' as const } },
} satisfies Prisma.ProfileInclude;

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly verificationAlerts: VerificationAlertsService,
    private readonly privacyFields: PrivacyFieldsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => MediaService))
    private readonly mediaService: MediaService,
    private readonly pushNotifications: PushNotificationService,
  ) {}

  async getQueue() {
    const profiles = await this.prisma.profile.findMany({
      where: {
        user: { isActive: true },
        OR: [
          { profileBiodataReviewStatus: MediaReviewStatus.pending },
        ],
      },
      include: {
        user: { select: { id: true, phone: true } },
        photos: {
          where: { status: MediaReviewStatus.pending },
          orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
        },
        nidDocuments: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return profiles.map((profile) => ({
      profileId: profile.id,
      profileCode: profile.profileCode,
      userId: profile.userId,
      fullName: profile.fullName,
      phone: profile.user.phone,
      isVerified: profile.isVerified,
      verifiedOnBehalf: profile.verifiedOnBehalf,
      creationMode: profile.creationMode,
      onBehalfRelation: profile.onBehalfRelation,
      nidVerifiedAt: profile.nidVerifiedAt?.toISOString() ?? null,
      creatorNidVerifiedAt: profile.creatorNidVerifiedAt?.toISOString() ?? null,
      pendingPhotoCount: profile.photos.length,
      nidReadyForReview: isNidReadyForReview(
        profile,
        profile.nidDocuments,
        NidDocumentSubject.member,
      ),
      creatorNidReadyForReview: isOnBehalfProfile(profile)
        ? isNidReadyForReview(
            profile,
            profile.nidDocuments,
            NidDocumentSubject.creator,
          )
        : false,
      biodataPending:
        profile.profileBiodataReviewStatus === MediaReviewStatus.pending,
      updatedAt: profile.updatedAt.toISOString(),
    }));
  }

  async getSubmission(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: submissionInclude,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    if (!profile.user.isActive) {
      throw new ForbiddenException('This account is no longer active');
    }

    const currentSnapshot = buildVerificationBiodataSnapshotFromProfile(profile);
    const previousSnapshot = parseStoredVerificationBiodataSnapshot(
      profile.profileBiodataApprovedSnapshot,
    );
    const biodataChanges = buildVerificationBiodataChanges(
      currentSnapshot,
      previousSnapshot,
    );

    return {
      profileId: profile.id,
      profileCode: profile.profileCode,
      userId: profile.userId,
      phone: profile.user.phone,
      phoneVerifiedAt: profile.user.phoneVerifiedAt?.toISOString() ?? null,
      isVerified: profile.isVerified,
      verifiedOnBehalf: profile.verifiedOnBehalf,
      creationMode: profile.creationMode,
      onBehalfRelation: profile.onBehalfRelation,
      nidVerifiedAt: profile.nidVerifiedAt?.toISOString() ?? null,
      creatorNidVerifiedAt: profile.creatorNidVerifiedAt?.toISOString() ?? null,
      profileBiodataReviewStatus: profile.profileBiodataReviewStatus,
      profileBiodataReviewedAt:
        profile.profileBiodataReviewedAt?.toISOString() ?? null,
      nidReadyForReview: isNidReadyForReview(
        profile,
        profile.nidDocuments,
        NidDocumentSubject.member,
      ),
      creatorNidReadyForReview: isOnBehalfProfile(profile)
        ? isNidReadyForReview(
            profile,
            profile.nidDocuments,
            NidDocumentSubject.creator,
          )
        : false,
      personal: {
        fullName: profile.fullName,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
        maritalStatus: profile.maritalStatus,
        divorceDetails: profile.divorceDetails,
        childrenCount: profile.childrenCount,
        heightUnit: profile.heightUnit,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        complexion: profile.complexion,
        hasDisability: profile.hasDisability,
        disabilityInfo: profile.disabilityInfo,
        religion: profile.religion,
        hasBeard: profile.hasBeard,
        prayerPractice: profile.prayerPractice,
        hijabPractice: profile.hijabPractice,
        smokingHabit: profile.smokingHabit,
        educationMedium: profile.educationMedium,
        highestDegree: profile.highestDegree,
        additionalEducationQualifications:
          profile.additionalEducationQualifications,
        institution: profile.institution,
        educationYear: profile.educationYear,
        educationSubject: profile.educationSubject,
        occupation: profile.occupation,
        company: profile.company,
        designation: profile.designation,
        monthlyIncomeRange: profile.monthlyIncomeRange,
        currentCountry: profile.currentCountry,
        currentDivision: profile.currentDivision,
        currentDistrict: profile.currentDistrict,
        currentUpazila: profile.currentUpazila,
        currentCityTown: profile.currentCityTown,
        currentAddressLine: profile.currentAddressLine,
        permanentCountry: profile.permanentCountry,
        permanentDivision: profile.permanentDivision,
        permanentDistrict: profile.permanentDistrict,
        permanentUpazila: profile.permanentUpazila,
        permanentCityTown: profile.permanentCityTown,
        permanentAddressLine: profile.permanentAddressLine,
        permanentSameAsCurrent: profile.permanentSameAsCurrent,
        biography: profile.biography,
        hobbies: profile.hobbies,
        interests: profile.interests,
        introduction: profile.introduction,
      },
      marital: {
        expectedMarriageTimeline: profile.expectedMarriageTimeline,
        dowryExpectation: profile.dowryExpectation,
        weddingCeremonyPreference: profile.weddingCeremonyPreference,
        expectedParenthoodTimeline: profile.expectedParenthoodTimeline,
        livingArrangements: profile.livingArrangements,
        livingArrangementsOther: profile.livingArrangementsOther,
        expectedKabinAmountMinBdt: profile.expectedKabinAmountMinBdt,
        expectedKabinAmountMaxBdt: profile.expectedKabinAmountMaxBdt,
      },
      familyInfo: profile.familyInfo
        ? {
            fatherName: profile.familyInfo.fatherName,
            fatherIsAlive: profile.familyInfo.fatherIsAlive,
            fatherEducation: profile.familyInfo.fatherEducation,
            fatherProfession: profile.familyInfo.fatherProfession,
            motherName: profile.familyInfo.motherName,
            motherIsAlive: profile.familyInfo.motherIsAlive,
            motherEducation: profile.familyInfo.motherEducation,
            motherProfession: profile.familyInfo.motherProfession,
            familyType: profile.familyInfo.familyType,
            familyStatus: profile.familyInfo.familyStatus,
            familyValues: profile.familyInfo.familyValues,
            familyAssets: profile.familyInfo.familyAssets,
          }
        : null,
      siblings: profile.siblings.map((sibling) => ({
        relationship: sibling.relationship,
        name: sibling.name,
        education: sibling.education,
        profession: sibling.profession,
        maritalStatus: sibling.maritalStatus,
        spouseName: sibling.spouseName,
        spouseEducation: sibling.spouseEducation,
        spouseProfession: sibling.spouseProfession,
      })),
      paternalRelatives: profile.paternalRelatives.map((relative) => ({
        relation: relative.relation,
        name: relative.name,
        education: relative.education,
        profession: relative.profession,
      })),
      maternalRelatives: profile.maternalRelatives.map((relative) => ({
        relation: relative.relation,
        name: relative.name,
        education: relative.education,
        profession: relative.profession,
      })),
      partnerPreference: profile.partnerPreference
        ? {
            ageMin: profile.partnerPreference.ageMin,
            ageMax: profile.partnerPreference.ageMax,
            heightUnit: profile.partnerPreference.heightUnit,
            heightMinCm: profile.partnerPreference.heightMinCm,
            heightMaxCm: profile.partnerPreference.heightMaxCm,
            weightMinKg: profile.partnerPreference.weightMinKg,
            weightMaxKg: profile.partnerPreference.weightMaxKg,
            preferredDistricts: profile.partnerPreference.preferredDistricts,
            minimumEducation: profile.partnerPreference.minimumEducation,
            preferredProfession: profile.partnerPreference.preferredProfession,
            beardPreference: profile.partnerPreference.beardPreference,
            prayerPreference: profile.partnerPreference.prayerPreference,
            hijabPreference: profile.partnerPreference.hijabPreference,
            maritalStatusPref: profile.partnerPreference.maritalStatusPref,
            additionalNotes: profile.partnerPreference.additionalNotes,
          }
        : null,
      photos: profile.photos.map((photo) => ({
        id: photo.id,
        type: photo.type,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        sortOrder: photo.sortOrder,
        status: photo.status,
        createdAt: photo.createdAt.toISOString(),
      })),
      nidDocuments: profile.nidDocuments.map((doc) => ({
        id: doc.id,
        side: doc.side,
        subject: doc.subject,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        status: doc.status,
        submittedAt: doc.submittedAt.toISOString(),
        reviewedAt: doc.reviewedAt?.toISOString() ?? null,
      })),
      biodataChanges,
    };
  }

  async exportAuditBiodata(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: biodataAuditExportInclude,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    if (!profile.user.isActive) {
      throw new ForbiddenException('This account is no longer active');
    }

    const rules = await this.privacyFields.listAll();
    return buildAuditBiodataExport(
      profile,
      rules.map((row) => ({
        fieldKey: row.fieldKey,
        isShareable: row.isShareable,
        minPrivacyLevel: row.minPrivacyLevel,
      })),
    );
  }

  async reviewPhoto(
    photoId: string,
    decision: 'approved' | 'rejected',
    officerMessage?: string,
  ) {
    const photo = await this.prisma.profilePhoto.findUnique({
      where: { id: photoId },
      include: {
        profile: { select: { id: true, userId: true, user: { select: { isActive: true } } } },
      },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }
    if (!photo.profile.user.isActive) {
      throw new ForbiddenException('This account is no longer active');
    }

    if (photo.status !== MediaReviewStatus.pending) {
      throw new BadRequestException('Photo has already been reviewed');
    }

    const status =
      decision === 'approved'
        ? MediaReviewStatus.approved
        : MediaReviewStatus.rejected;

    if (decision === 'rejected') {
      this.requireRejectionMessage(officerMessage);
    }

    const updated = await this.prisma.profilePhoto.update({
      where: { id: photoId },
      data: { status },
    });

    const alertType = this.photoAlertType(photo.type, decision);
    await this.verificationAlerts.createAlert(photo.profile.userId, alertType, {
      officerMessage:
        decision === 'rejected' ? officerMessage?.trim() : undefined,
      contextKey: decision === 'rejected' ? photoId : undefined,
    });
    if (decision === 'rejected') {
      void this.notifyVerificationActionRequired(
        photo.profile.userId,
        'A verification officer rejected one of your photos. Open Photos & Verification to review.',
      );
    }
    await this.finalizeReview(updated.profileId, photo.profile.userId);

    return {
      id: updated.id,
      status: updated.status,
      profileId: updated.profileId,
    };
  }

  async reviewProfileBiodata(
    profileId: string,
    decision: 'approved' | 'rejected',
    officerMessage?: string,
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: submissionInclude,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    if (!profile.user.isActive) {
      throw new ForbiddenException('This account is no longer active');
    }

    if (profile.profileBiodataReviewStatus !== MediaReviewStatus.pending) {
      throw new BadRequestException(
        'Profile biodata is not pending review or has already been reviewed',
      );
    }

    if (decision === 'rejected') {
      this.requireRejectionMessage(officerMessage);
    }

    const now = new Date();
    const status =
      decision === 'approved'
        ? MediaReviewStatus.approved
        : MediaReviewStatus.rejected;

    const approvedSnapshot =
      decision === 'approved'
        ? buildVerificationBiodataSnapshotFromProfile(profile)
        : undefined;

    await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        profileBiodataReviewStatus: status,
        profileBiodataReviewedAt: now,
        ...(approvedSnapshot
          ? { profileBiodataApprovedSnapshot: approvedSnapshot as Prisma.InputJsonValue }
          : {}),
      },
    });

    await this.verificationAlerts.createAlert(
      profile.userId,
      decision === 'approved'
        ? VerificationAlertType.biodata_approved
        : VerificationAlertType.biodata_rejected,
      {
        officerMessage:
          decision === 'rejected' ? officerMessage?.trim() : undefined,
        contextKey: decision === 'rejected' ? profileId : undefined,
      },
    );
    if (decision === 'rejected') {
      void this.notifyVerificationActionRequired(
        profile.userId,
        'Your profile biodata was rejected. Open Photos & Verification to review the officer feedback.',
      );
    }
    await this.finalizeReview(profileId, profile.userId);

    return {
      profileId,
      decision,
      profileBiodataReviewStatus: status,
      profileBiodataReviewedAt: now.toISOString(),
      isVerified: await this.getIsVerified(profileId),
    };
  }

  async reviewNid(
    profileId: string,
    decision: 'approved' | 'rejected',
    subject: NidDocumentSubject = NidDocumentSubject.member,
    officerMessage?: string,
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        nidDocuments: true,
        user: { select: { isActive: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    if (!profile.user.isActive) {
      throw new ForbiddenException('This account is no longer active');
    }

    if (
      subject === NidDocumentSubject.creator &&
      !isOnBehalfProfile(profile)
    ) {
      throw new BadRequestException('This profile does not have creator NID');
    }

    const verifiedAt =
      subject === NidDocumentSubject.creator
        ? profile.creatorNidVerifiedAt
        : profile.nidVerifiedAt;

    if (verifiedAt) {
      throw new BadRequestException('NID is already verified');
    }

    if (!isNidReadyForReview(profile, profile.nidDocuments, subject)) {
      throw new BadRequestException(
        'Both NID front and back must be uploaded before review',
      );
    }

    if (decision === 'rejected') {
      this.requireRejectionMessage(officerMessage);
    }

    const now = new Date();
    const status =
      decision === 'approved'
        ? MediaReviewStatus.approved
        : MediaReviewStatus.rejected;

    await this.prisma.$transaction([
      this.prisma.nidDocument.updateMany({
        where: { profileId, subject },
        data: { status, reviewedAt: now },
      }),
      this.prisma.profile.update({
        where: { id: profileId },
        data:
          decision === 'approved'
            ? subject === NidDocumentSubject.creator
              ? { creatorNidVerifiedAt: now }
              : { nidVerifiedAt: now }
            : subject === NidDocumentSubject.creator
              ? { creatorNidVerifiedAt: null }
              : { nidVerifiedAt: null },
      }),
    ]);

    await this.verificationAlerts.createAlert(
      profile.userId,
      decision === 'approved'
        ? VerificationAlertType.nid_approved
        : VerificationAlertType.nid_rejected,
      {
        officerMessage:
          decision === 'rejected' ? officerMessage?.trim() : undefined,
        contextKey:
          decision === 'rejected' ? `${profileId}:${subject}` : undefined,
      },
    );
    if (decision === 'rejected') {
      void this.notifyVerificationActionRequired(
        profile.userId,
        'Your NID documents were rejected. Open Photos & Verification to upload clearer images.',
      );
    }
    await this.finalizeReview(profileId, profile.userId);

    return {
      profileId,
      subject,
      decision,
      nidVerifiedAt:
        subject === NidDocumentSubject.member && decision === 'approved'
          ? now.toISOString()
          : null,
      creatorNidVerifiedAt:
        subject === NidDocumentSubject.creator && decision === 'approved'
          ? now.toISOString()
          : null,
      isVerified: await this.getIsVerified(profileId),
      verifiedOnBehalf: await this.getVerifiedOnBehalf(profileId),
    };
  }

  async getPhotoFile(profileId: string, photoId: string) {
    const photo = await this.prisma.profilePhoto.findFirst({
      where: { id: photoId, profileId },
      include: { profile: { select: { userId: true } } },
    });

    if (!photo || !(await this.storage.exists(photo.storageKey))) {
      throw new NotFoundException('Photo not found');
    }

    return {
      stream: await this.storage.createReadStream(photo.storageKey),
      mimeType: photo.mimeType,
    };
  }

  async getNidFile(
    profileId: string,
    side: NidDocumentSide,
    subject: NidDocumentSubject = NidDocumentSubject.member,
  ) {
    const document = await this.prisma.nidDocument.findUnique({
      where: {
        profileId_side_subject: { profileId, side, subject },
      },
    });

    if (!document || !(await this.storage.exists(document.storageKey))) {
      throw new NotFoundException('NID document not found');
    }

    return {
      stream: await this.storage.createReadStream(document.storageKey),
      mimeType: document.mimeType,
    };
  }

  private requireRejectionMessage(officerMessage?: string) {
    if (!officerMessage?.trim()) {
      throw new BadRequestException(
        'A rejection explanation is required for the member',
      );
    }
  }

  private photoAlertType(
    type: ProfilePhotoType,
    decision: 'approved' | 'rejected',
  ): VerificationAlertType {
    if (type === ProfilePhotoType.primary) {
      return decision === 'approved'
        ? VerificationAlertType.photo_approved_primary
        : VerificationAlertType.photo_rejected_primary;
    }
    return decision === 'approved'
      ? VerificationAlertType.photo_approved_gallery
      : VerificationAlertType.photo_rejected_gallery;
  }

  private async finalizeReview(profileId: string, userId: string) {
    const before = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { isVerified: true },
    });
    await this.recomputeIsVerified(profileId);
    const after = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { isVerified: true },
    });
    if (!before?.isVerified && after?.isVerified) {
      await this.verificationAlerts.createAlert(
        userId,
        VerificationAlertType.profile_fully_verified,
      );
      void this.notifyProfileVerified(userId);
    }

    if (before?.isVerified !== after?.isVerified) {
      this.authService.clearSessionCache(userId);
    }
    this.mediaService.clearMediaSummaryCacheForUser(userId);
  }

  private async notifyProfileVerified(userId: string) {
    try {
      await this.pushNotifications.sendToUser(userId, {
        title: 'Profile verified',
        body: 'Your profile is fully verified. You can now explore matches and upgrade membership.',
        data: { type: 'verification' },
        channelId: PUSH_CHANNEL_VERIFICATION,
        ...MEMBER_INCOMING_PUSH,
      });
    } catch {
      // Push delivery must not block verification flow.
    }
  }

  private async notifyVerificationActionRequired(userId: string, body: string) {
    try {
      await this.pushNotifications.sendToUser(userId, {
        title: 'Verification update',
        body,
        data: { type: 'verification' },
        channelId: PUSH_CHANNEL_VERIFICATION,
        ...MEMBER_INCOMING_PUSH,
      });
    } catch {
      // Push delivery must not block verification flow.
    }
  }

  private async recomputeIsVerified(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: { photos: true, nidDocuments: true },
    });

    if (!profile) return;

    const isVerified = isProfileFullyVerified(profile);
    const verifiedOnBehalf = isVerified && isOnBehalfProfile(profile);
    if (
      profile.isVerified !== isVerified ||
      profile.verifiedOnBehalf !== verifiedOnBehalf
    ) {
      await this.prisma.profile.update({
        where: { id: profileId },
        data: { isVerified, verifiedOnBehalf },
      });
    }
  }

  private async getVerifiedOnBehalf(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { verifiedOnBehalf: true },
    });
    return profile?.verifiedOnBehalf ?? false;
  }

  private async getIsVerified(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { isVerified: true },
    });
    return profile?.isVerified ?? false;
  }
}
