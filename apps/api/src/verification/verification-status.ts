import {
  MediaReviewStatus,
  NidDocumentSide,
  NidDocumentSubject,
  ProfileCreationMode,
  ProfilePhotoType,
  type NidDocument,
  type Profile,
  type ProfilePhoto,
} from '@prisma/client';

export type ProfileVerificationPayload = Pick<
  Profile,
  | 'profileBiodataReviewStatus'
  | 'nidVerifiedAt'
  | 'creatorNidVerifiedAt'
  | 'creationMode'
> & {
  photos: Pick<ProfilePhoto, 'type' | 'status'>[];
  nidDocuments: Pick<NidDocument, 'side' | 'status' | 'subject'>[];
};

function hasApprovedNidPair(
  documents: Pick<NidDocument, 'side' | 'status' | 'subject'>[],
  subject: NidDocumentSubject,
  verifiedAt: Date | null,
): boolean {
  if (!verifiedAt) {
    return false;
  }

  const front = documents.find(
    (doc) => doc.subject === subject && doc.side === NidDocumentSide.front,
  );
  const back = documents.find(
    (doc) => doc.subject === subject && doc.side === NidDocumentSide.back,
  );

  return (
    front?.status === MediaReviewStatus.approved &&
    back?.status === MediaReviewStatus.approved
  );
}

function photosAreVerified(
  photos: Pick<ProfilePhoto, 'type' | 'status'>[],
): boolean {
  const primary = photos.find((photo) => photo.type === ProfilePhotoType.primary);
  return primary?.status === MediaReviewStatus.approved;
}

export function isOnBehalfProfile(
  profile: Pick<Profile, 'creationMode'>,
): boolean {
  return profile.creationMode === ProfileCreationMode.on_behalf;
}

export function hasVerificationRejections(
  profile: ProfileVerificationPayload,
): boolean {
  if (profile.profileBiodataReviewStatus === MediaReviewStatus.rejected) {
    return true;
  }

  if (
    profile.photos.some((photo) => photo.status === MediaReviewStatus.rejected)
  ) {
    return true;
  }

  return profile.nidDocuments.some(
    (doc) => doc.status === MediaReviewStatus.rejected,
  );
}

export function isProfileFullyVerified(
  profile: ProfileVerificationPayload,
): boolean {
  if (profile.profileBiodataReviewStatus !== MediaReviewStatus.approved) {
    return false;
  }

  if (!photosAreVerified(profile.photos)) {
    return false;
  }

  if (isOnBehalfProfile(profile)) {
    return hasApprovedNidPair(
      profile.nidDocuments,
      NidDocumentSubject.creator,
      profile.creatorNidVerifiedAt,
    );
  }

  return hasApprovedNidPair(
    profile.nidDocuments,
    NidDocumentSubject.member,
    profile.nidVerifiedAt,
  );
}

export function isNidReadyForReview(
  profile: Pick<Profile, 'nidVerifiedAt' | 'creatorNidVerifiedAt' | 'creationMode'>,
  documents: Pick<NidDocument, 'side' | 'status' | 'subject'>[],
  subject: NidDocumentSubject,
): boolean {
  const verifiedAt =
    subject === NidDocumentSubject.creator
      ? profile.creatorNidVerifiedAt
      : profile.nidVerifiedAt;

  if (verifiedAt) {
    return false;
  }

  const front = documents.find(
    (doc) => doc.subject === subject && doc.side === NidDocumentSide.front,
  );
  const back = documents.find(
    (doc) => doc.subject === subject && doc.side === NidDocumentSide.back,
  );

  if (!front || !back) {
    return false;
  }

  return (
    front.status === MediaReviewStatus.pending ||
    back.status === MediaReviewStatus.pending
  );
}
