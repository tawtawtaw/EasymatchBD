import type {
  VerificationAlertType,
  VerificationFeedback,
  VerificationSummaryItem,
  ProfileMedia,
} from "../types/media";

export function isActionableVerificationAlert(
  alertType: VerificationAlertType,
): boolean {
  return alertType.includes("rejected");
}

const SUMMARY_ALERT_TYPES: Record<string, VerificationAlertType[]> = {
  biodata: ["biodata_rejected"],
  nid: ["nid_rejected"],
  photoPrimary: ["photo_rejected_primary"],
  photoGallery: ["photo_rejected_gallery"],
};

export function rejectionMessageForSummaryItem(
  alerts: VerificationFeedback["alerts"],
  item: VerificationSummaryItem,
): string | null {
  if (item.status !== "rejected") return null;

  const types = SUMMARY_ALERT_TYPES[item.labelKey] ?? [];
  const match = alerts.find((alert) => {
    if (!types.includes(alert.alertType) || !alert.officerMessage?.trim()) {
      return false;
    }
    if (item.photoId && alert.contextKey) {
      return alert.contextKey === item.photoId;
    }
    return true;
  });

  return match?.officerMessage?.trim() ?? null;
}

/** Align checklist biodata row with profile review status (stale media summary cache). */
export function reconcileVerificationFeedbackWithMedia(
  media: Pick<ProfileMedia, "profileBiodataReviewStatus" | "verificationFeedback">,
): VerificationFeedback | null {
  const feedback = media.verificationFeedback;
  if (!feedback) return null;

  const status = media.profileBiodataReviewStatus;
  if (status !== "pending" && status !== "approved") {
    return feedback;
  }

  const summaryStatus = status === "approved" ? "approved" : "pending";
  return {
    ...feedback,
    summary: feedback.summary.map((item) =>
      item.category === "biodata"
        ? {
            ...item,
            status: summaryStatus,
            needsAction: false,
          }
        : item,
    ),
  };
}

export function shouldShowVerificationFeedback(
  feedback: VerificationFeedback | null | undefined,
): feedback is VerificationFeedback {
  if (!feedback) return false;
  if (feedback.isFullyVerified) return false;
  if (
    feedback.alerts.some(
      (alert) =>
        !alert.readAt && isActionableVerificationAlert(alert.alertType),
    )
  ) {
    return true;
  }
  return feedback.summary.some(
    (item) =>
      item.needsAction ||
      item.status === "not_submitted" ||
      item.status === "pending",
  );
}
