import { PrivacyLevel } from '@easymatch/shared';
import { ProfilePhotoType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import {
  buildVisibleProfileView,
  type PrivacyRule,
} from '../privacy/profile-privacy-filter';

export const biodataAuditExportInclude = {
  user: { select: { phone: true, phoneVerifiedAt: true, isActive: true } },
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
  photos: {
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
  nidDocuments: true,
} satisfies Prisma.ProfileInclude;

export type BiodataAuditProfile = Prisma.ProfileGetPayload<{
  include: typeof biodataAuditExportInclude;
}>;

function buildAuditPrivacyRules(rules: PrivacyRule[]): PrivacyRule[] {
  return rules.map((rule) => ({
    fieldKey: rule.fieldKey,
    isShareable: true,
    minPrivacyLevel: 0,
  }));
}

export function buildAuditBiodataExport(
  profile: BiodataAuditProfile,
  rules: PrivacyRule[],
) {
  const view = buildVisibleProfileView(
    profile,
    buildAuditPrivacyRules(rules),
    PrivacyLevel.SERIOUS_CONSIDERATION,
    { includeOwnerPhone: true },
  );

  const primaryPhoto = profile.photos.find(
    (photo) => photo.type === ProfilePhotoType.primary,
  );
  const galleryPhotoIds = profile.photos
    .filter((photo) => photo.type === ProfilePhotoType.gallery)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((photo) => photo.id);

  return {
    profileId: profile.id,
    profileCode: profile.profileCode ?? '',
    privacyLevel: PrivacyLevel.SERIOUS_CONSIDERATION,
    generatedAt: new Date().toISOString(),
    auditRecord: true,
    personal: view.personal,
    marital: view.marital,
    family: view.family,
    siblings: view.siblings,
    paternalRelatives: view.paternalRelatives,
    maternalRelatives: view.maternalRelatives,
    partner: view.partner,
    media: {
      ...view.media,
      primaryPhotoId: primaryPhoto?.id ?? null,
      galleryPhotoIds,
      phone: profile.user.phone,
    },
    hiddenFieldCount: 0,
    verification: {
      phone: profile.user.phone,
      phoneVerifiedAt: profile.user.phoneVerifiedAt?.toISOString() ?? null,
      nidVerifiedAt: profile.nidVerifiedAt?.toISOString() ?? null,
      creatorNidVerifiedAt: profile.creatorNidVerifiedAt?.toISOString() ?? null,
      profileBiodataReviewStatus: profile.profileBiodataReviewStatus,
      profileBiodataReviewedAt:
        profile.profileBiodataReviewedAt?.toISOString() ?? null,
      isVerified: profile.isVerified,
      verifiedOnBehalf: profile.verifiedOnBehalf,
      creationMode: profile.creationMode,
      onBehalfRelation: profile.onBehalfRelation,
      nidDocuments: profile.nidDocuments.map((doc) => ({
        subject: doc.subject,
        side: doc.side,
        status: doc.status,
        reviewedAt: doc.reviewedAt?.toISOString() ?? null,
      })),
    },
  };
}
