import { StyleSheet, Text, View, Pressable } from "react-native";
import type { tProfileMedia } from "../i18n/messages";
import {
  isActionableVerificationAlert,
  rejectionMessageForSummaryItem,
} from "../lib/verification-feedback";
import { biodataSubmittedFromSummary } from "../lib/verification-submit-state";
import type { VerificationFeedback, VerificationSummaryItem } from "../types/media";
import { colors } from "../theme/colors";

type Copy = ReturnType<typeof tProfileMedia>;

type SummaryLabelKey = keyof Copy["summaryLabels"];
type SummaryStatusKey = keyof Copy["summaryStatus"];
type ActionRequiredKey = keyof Copy["actionRequired"];
type AlertKey = keyof Copy["alerts"];

function summaryLabel(copy: Copy, key: string) {
  return copy.summaryLabels[key as SummaryLabelKey] ?? key;
}

function summaryStatus(copy: Copy, status: string) {
  return copy.summaryStatus[status as SummaryStatusKey] ?? status;
}

function actionRequired(copy: Copy, key: string) {
  return copy.actionRequired[key as ActionRequiredKey] ?? "";
}

function alertMessage(copy: Copy, alertType: string) {
  return copy.alerts[alertType as AlertKey] ?? alertType;
}

function SummaryList({
  copy,
  feedback,
  items,
  showActionHints,
}: {
  copy: Copy;
  feedback: VerificationFeedback;
  items: VerificationSummaryItem[];
  showActionHints?: boolean;
}) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => {
        const rejectionMessage = rejectionMessageForSummaryItem(
          feedback.alerts,
          item,
        );
        return (
          <View
            key={`${item.category}-${item.labelKey}-${item.photoType ?? "na"}-${item.photoId ?? index}`}
            style={styles.listItem}
          >
            <Text style={styles.listItemText}>
              {summaryLabel(copy, item.labelKey)}: {summaryStatus(copy, item.status)}
            </Text>
            {showActionHints && item.needsAction ? (
              <Text style={styles.actionHint}>{actionRequired(copy, item.labelKey)}</Text>
            ) : null}
            {rejectionMessage ? (
              <Text style={styles.officerNote}>
                <Text style={styles.officerLabel}>{copy.officerFeedbackLabel}: </Text>
                {rejectionMessage}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function VerificationFeedbackPanel({
  copy,
  feedback,
  compact = false,
  hideAlertHistory = false,
  onDismiss,
  dismissing = false,
}: {
  copy: Copy;
  feedback: VerificationFeedback;
  compact?: boolean;
  /** Hide read-only approval history on Profile / Discovery summaries. */
  hideAlertHistory?: boolean;
  onDismiss?: () => void;
  dismissing?: boolean;
}) {
  const unreadAlerts = feedback.alerts.filter((alert) => {
    if (alert.readAt) return false;
    if (hideAlertHistory) {
      return isActionableVerificationAlert(alert.alertType);
    }
    return true;
  });
  const itemsNeedingMemberAction = feedback.summary.filter(
    (item) => item.needsAction || item.status === "not_submitted",
  );
  const biodataSubmitted = biodataSubmittedFromSummary(feedback.summary);
  const pendingReviewItems = biodataSubmitted
    ? feedback.summary.filter(
        (item) => item.status === "pending" && !item.needsAction,
      )
    : [];

  return (
    <View style={styles.wrap}>
      {feedback.isFullyVerified ? (
        <View style={[styles.box, styles.boxSuccess]}>
          <Text style={styles.boxTitleSuccess}>
            {copy.alerts.profile_fully_verified}
          </Text>
        </View>
      ) : null}

      {unreadAlerts.length > 0 ? (
        <View style={[styles.box, styles.boxCard]}>
          <View style={styles.alertHeader}>
            <View style={styles.alertHeaderText}>
              <Text style={styles.boxTitle}>{copy.verificationUpdatesTitle}</Text>
              <Text style={styles.boxHint}>{copy.verificationUpdatesHint}</Text>
            </View>
            {onDismiss ? (
              <Pressable
                style={[styles.dismissButton, dismissing && styles.dismissButtonDisabled]}
                onPress={() => !dismissing && onDismiss()}
                disabled={dismissing}
              >
                <Text style={styles.dismissButtonText}>
                  {dismissing ? copy.dismissingAlerts : copy.dismissAlerts}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {unreadAlerts.map((alert) => (
            <View key={alert.id} style={styles.alertItem}>
              <Text style={styles.alertText}>{alertMessage(copy, alert.alertType)}</Text>
              {alert.officerMessage?.trim() ? (
                <Text style={styles.officerNote}>
                  <Text style={styles.officerLabel}>{copy.officerFeedbackLabel}: </Text>
                  {alert.officerMessage.trim()}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {compact ? (
        <>
          {itemsNeedingMemberAction.length > 0 ? (
            <View style={[styles.box, styles.boxPending]}>
              <Text style={styles.boxTitle}>{copy.verificationActionBanner}</Text>
              <SummaryList
                copy={copy}
                feedback={feedback}
                items={itemsNeedingMemberAction}
                showActionHints
              />
            </View>
          ) : null}
          {!feedback.isFullyVerified && pendingReviewItems.length > 0 ? (
            <View style={[styles.box, styles.boxPending]}>
              <Text style={styles.boxTitle}>{copy.verificationPendingBanner}</Text>
              <Text style={styles.boxHint}>{copy.verificationPendingHint}</Text>
              <SummaryList copy={copy} feedback={feedback} items={pendingReviewItems} />
            </View>
          ) : null}
        </>
      ) : (
        <View style={[styles.box, styles.boxCard]}>
          <Text style={styles.boxTitle}>{copy.verificationChecklistTitle}</Text>
          <Text style={styles.boxHint}>{copy.verificationChecklistHint}</Text>
          <SummaryList copy={copy} feedback={feedback} items={feedback.summary} showActionHints />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  box: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  boxCard: {
    backgroundColor: colors.white,
    borderColor: colors.rose100,
  },
  boxPending: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  boxSuccess: {
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac",
  },
  boxTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.zinc900,
  },
  boxTitleSuccess: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.emerald600,
  },
  boxHint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc600,
  },
  list: { marginTop: 8, gap: 8 },
  listItem: { gap: 4 },
  listItemText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#92400e",
  },
  actionHint: {
    fontSize: 12,
    lineHeight: 17,
    color: "#78350f",
  },
  alertItem: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.rose50,
    borderWidth: 1,
    borderColor: colors.rose100,
  },
  alertText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc800,
  },
  officerNote: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.zinc800,
  },
  officerLabel: {
    fontWeight: "700",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  alertHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  dismissButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.zinc300,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  dismissButtonDisabled: {
    opacity: 0.6,
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc700,
  },
});
