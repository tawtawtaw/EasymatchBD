import { isOnBehalfProfile } from "@easymatch/shared";
import type { NidStatus, ProfileMedia } from "@/lib/media";

export function isVerificationPackageComplete(media: ProfileMedia) {
  const hasPrimary = media.photos.some((photo) => photo.type === "primary");
  const onBehalf = isOnBehalfProfile(media);
  const requiredSubject = onBehalf ? "creator" : "member";
  const requiredDocs = media.nidDocuments.filter(
    (doc) => doc.subject === requiredSubject,
  );

  return (
    hasPrimary &&
    requiredDocs.some((doc) => doc.side === "front") &&
    requiredDocs.some((doc) => doc.side === "back")
  );
}

export function requiredNidStatus(media: ProfileMedia): NidStatus | null {
  return isOnBehalfProfile(media)
    ? (media.creatorNidStatus ?? "not_submitted")
    : media.nidStatus;
}

export function memberHadNidRejection(media: ProfileMedia) {
  if (
    media.verificationFeedback?.alerts.some(
      (alert) => alert.alertType === "nid_rejected",
    )
  ) {
    return true;
  }

  return media.verificationFeedback?.summary.some(
    (item) => item.category === "nid" && item.needsAction,
  ) ?? false;
}

export function nidNeedsResubmit(media: ProfileMedia) {
  const status = requiredNidStatus(media);
  if (status === "rejected") return true;
  if (status !== "pending") return false;

  return (
    memberHadNidRejection(media) ||
    media.profileBiodataReviewStatus === "approved"
  );
}

export function computeVerificationSubmitState(
  media: ProfileMedia,
  options?: {
    amendmentDirty?: boolean;
    biodataComplete?: boolean;
  },
) {
  const packageComplete = isVerificationPackageComplete(media);
  const biodataRejected = media.profileBiodataReviewStatus === "rejected";
  const biodataPending = media.profileBiodataReviewStatus === "pending";
  const nidRejected = requiredNidStatus(media) === "rejected";
  const canResubmit =
    packageComplete &&
    !nidRejected &&
    (biodataRejected || nidNeedsResubmit(media));
  const canSubmitVerifiedAmendment =
    Boolean(options?.biodataComplete) &&
    packageComplete &&
    media.isVerified &&
    Boolean(options?.amendmentDirty) &&
    !biodataPending &&
    !nidRejected;
  const isPendingReview =
    biodataPending && !canResubmit && !canSubmitVerifiedAmendment;

  return {
    packageComplete,
    biodataRejected,
    biodataPending,
    nidRejected,
    canResubmit,
    canSubmitVerifiedAmendment,
    isPendingReview,
    readyToSubmit:
      packageComplete &&
      !media.isVerified &&
      !biodataPending &&
      !canResubmit &&
      !nidRejected,
  };
}
