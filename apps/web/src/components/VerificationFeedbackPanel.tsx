"use client";

import { useTranslations } from "next-intl";
import type { VerificationFeedback } from "@/lib/media";
import {
  rejectionMessageForSummaryItem,
} from "@/lib/verification-feedback";

function statusIcon(status: string) {
  switch (status) {
    case "approved":
      return "✓";
    case "rejected":
      return "✗";
    case "pending":
      return "…";
    default:
      return "–";
  }
}

function statusRowClass(status: string) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-900";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-950";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

function alertBoxClass(alertType: string) {
  return alertType.includes("rejected")
    ? "border-red-200 bg-red-50"
    : alertType.includes("approved") || alertType === "profile_fully_verified"
      ? "border-emerald-200 bg-emerald-50"
      : "border-amber-200 bg-amber-50";
}

function SummaryList({
  items,
  feedback,
  t,
  showActionHints,
}: {
  items: VerificationFeedback["summary"];
  feedback: VerificationFeedback;
  t: ReturnType<typeof useTranslations<"profile.media">>;
  showActionHints?: boolean;
}) {
  return (
    <ul className="mt-2 list-inside list-disc space-y-1">
      {items.map((item) => {
        const rejectionMessage = rejectionMessageForSummaryItem(
          feedback.alerts,
          item,
        );
        return (
          <li key={`${item.category}-${item.photoId ?? item.labelKey}`}>
            {t(`summaryLabels.${item.labelKey}`)}:{" "}
            {t(`summaryStatus.${item.status}`)}
            {showActionHints && item.needsAction && (
              <span className="block pl-5 text-amber-900">
                {t(`actionRequired.${item.labelKey}`)}
              </span>
            )}
            {rejectionMessage ? (
              <span className="mt-1 block pl-5 whitespace-pre-wrap text-amber-950">
                <span className="font-semibold">{t("officerFeedbackLabel")} </span>
                {rejectionMessage}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function VerificationFeedbackPanel({
  feedback,
  onDismiss,
  dismissing,
  compact,
}: {
  feedback: VerificationFeedback;
  onDismiss?: () => void;
  dismissing?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("profile.media");
  const unreadAlerts = feedback.alerts.filter((alert) => !alert.readAt);
  const itemsNeedingMemberAction = feedback.summary.filter(
    (item) => item.needsAction || item.status === "not_submitted",
  );
  const pendingReviewItems = feedback.summary.filter(
    (item) => item.status === "pending" && !item.needsAction,
  );
  const showPanel =
    unreadAlerts.length > 0 ||
    (!feedback.isFullyVerified &&
      (itemsNeedingMemberAction.length > 0 || pendingReviewItems.length > 0));

  if (!showPanel) {
    return null;
  }

  return (
    <div className="space-y-4">
      {feedback.isFullyVerified && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
          <p className="font-semibold text-emerald-900">{t("alerts.profile_fully_verified")}</p>
        </div>
      )}

      {unreadAlerts.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-zinc-900">{t("verificationUpdatesTitle")}</h3>
              <p className="mt-1 text-sm text-zinc-600">{t("verificationUpdatesHint")}</p>
            </div>
            {onDismiss && (
              <button
                type="button"
                disabled={dismissing}
                onClick={onDismiss}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {t("dismissAlerts")}
              </button>
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {unreadAlerts.map((alert) => (
              <li
                key={alert.id}
                className={`rounded-lg border px-3 py-2 text-sm ${alertBoxClass(alert.alertType)}`}
              >
                <p>{t(`alerts.${alert.alertType}`)}</p>
                {alert.officerMessage?.trim() ? (
                  <div className="mt-2 rounded-md border border-red-200/70 bg-white/70 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-900/80">
                      {t("officerFeedbackLabel")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-red-950">
                      {alert.officerMessage.trim()}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {compact ? (
        <>
          {itemsNeedingMemberAction.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">{t("verificationActionBanner")}</p>
              <SummaryList
                items={itemsNeedingMemberAction}
                feedback={feedback}
                t={t}
                showActionHints
              />
              <p className="mt-2 text-sm">{t("openPhotosTabHint")}</p>
            </div>
          )}
          {!feedback.isFullyVerified && pendingReviewItems.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">{t("verificationPendingBanner")}</p>
              <p className="mt-1 text-sm">{t("verificationPendingHint")}</p>
              <SummaryList
                items={pendingReviewItems}
                feedback={feedback}
                t={t}
              />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-zinc-900">{t("verificationChecklistTitle")}</h3>
          <p className="mt-1 text-sm text-zinc-600">{t("verificationChecklistHint")}</p>
          <ul className="mt-4 space-y-2">
            {feedback.summary.map((item) => {
              const rejectionMessage = rejectionMessageForSummaryItem(
                feedback.alerts,
                item,
              );
              return (
              <li
                key={`${item.category}-${item.photoId ?? item.labelKey}`}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${statusRowClass(item.status)}`}
              >
                <span className="mt-0.5 font-bold" aria-hidden>
                  {statusIcon(item.status)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {t(`summaryLabels.${item.labelKey}`)}
                    {": "}
                    {t(`summaryStatus.${item.status}`)}
                  </p>
                  {item.needsAction && (
                    <p className="mt-1 text-sm opacity-90">
                      {t(`actionRequired.${item.labelKey}`)}
                    </p>
                  )}
                  {rejectionMessage ? (
                    <div className="mt-2 rounded-md border border-red-200/70 bg-white/70 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-900/80">
                        {t("officerFeedbackLabel")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-red-950">
                        {rejectionMessage}
                      </p>
                    </div>
                  ) : null}
                </div>
              </li>
            );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
