import { isOnBehalfProfile } from "@easymatch/shared";
import type { NidStatus, ProfileMedia, VerificationSummaryItem } from "../types/media";

export function biodataSubmittedForReview(
  profileBiodataReviewStatus: ProfileMedia["profileBiodataReviewStatus"],
): boolean {
  return (
    profileBiodataReviewStatus === "pending" ||
    profileBiodataReviewStatus === "approved"
  );
}

export function biodataSubmittedFromSummary(
  summary: VerificationSummaryItem[],
): boolean {
  const biodata = summary.find((item) => item.category === "biodata");
  return biodata?.status === "pending" || biodata?.status === "approved";
}

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

  return (
    media.verificationFeedback?.summary.some(
      (item) => item.category === "nid" && item.needsAction,
    ) ?? false
  );
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

export function computeVerificationSubmitState(media: ProfileMedia) {
  const packageComplete = isVerificationPackageComplete(media);
  const biodataRejected = media.profileBiodataReviewStatus === "rejected";
  const biodataPending = media.profileBiodataReviewStatus === "pending";
  const nidRejected = requiredNidStatus(media) === "rejected";
  const canResubmit =
    packageComplete &&
    !nidRejected &&
    (biodataRejected || nidNeedsResubmit(media));
  const isPendingReview = biodataPending && !canResubmit;

  return {
    packageComplete,
    biodataRejected,
    biodataPending,
    nidRejected,
    canResubmit,
    isPendingReview,
    readyToSubmit:
      packageComplete &&
      !media.isVerified &&
      !biodataPending &&
      !canResubmit &&
      !nidRejected,
  };
}

/** Member has submitted and is waiting on a verification officer — no further member action. */
export function isVerificationAwaitingOfficer(media: ProfileMedia) {
  if (media.isVerified || media.verificationFeedback?.isFullyVerified) {
    return false;
  }

  const state = computeVerificationSubmitState(media);
  if (state.canResubmit || state.biodataRejected) return false;

  // Uploaded photos/NID are "pending" in storage before the member submits the package.
  if (!biodataSubmittedForReview(media.profileBiodataReviewStatus)) {
    return false;
  }

  if (state.biodataPending || state.isPendingReview) return true;

  const feedback = media.verificationFeedback;
  if (feedback && !feedback.isFullyVerified) {
    const needsAction = feedback.summary.some(
      (item) => item.needsAction || item.status === "rejected",
    );
    const hasPending = feedback.summary.some((item) => item.status === "pending");
    if (hasPending && !needsAction && state.packageComplete) {
      return true;
    }
  }

  return false;
}
