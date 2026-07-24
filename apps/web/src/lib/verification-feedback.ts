import type {
  VerificationAlertType,
  VerificationFeedback,
  VerificationSummaryItem,
} from "@/lib/media";

const SUMMARY_ALERT_TYPES: Record<
  string,
  VerificationAlertType[]
> = {
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

export function isRejectionAlert(alertType: VerificationAlertType) {
  return alertType.includes("rejected");
}
