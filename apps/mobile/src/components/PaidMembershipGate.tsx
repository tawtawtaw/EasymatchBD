import { Pressable, StyleSheet, Text, View } from "react-native";
import { tMembership } from "../i18n/messages";
import { useMemberVerificationSnapshot } from "../hooks/use-member-verification-state";
import { useMembershipCheckout } from "../hooks/use-membership-checkout";
import { navigateToProfileMedia } from "../navigation/navigateProfileMedia";
import type { AppLocale } from "../lib/locale";
import { colors } from "../theme/colors";

export type PaidFeature = "biodata" | "interest" | "messages" | "videoCalls" | "connect";

type Props = {
  feature?: PaidFeature;
  locale: AppLocale;
  compact?: boolean;
  onVerifyRequired?: () => void;
};

export function PaidMembershipGate({
  feature = "connect",
  locale,
  compact = false,
  onVerifyRequired,
}: Props) {
  const copy = tMembership(locale);
  const featureCopy = copy.required[feature];
  const { verified, awaitingOfficer, needsVerificationAction } =
    useMemberVerificationSnapshot();
  const { openCheckout } = useMembershipCheckout();

  function handleUpgrade() {
    if (!verified) {
      if (awaitingOfficer || !needsVerificationAction) {
        return;
      }
      if (onVerifyRequired) {
        onVerifyRequired();
      } else {
        navigateToProfileMedia();
      }
      return;
    }
    void openCheckout();
  }

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={[styles.title, compact && styles.titleCompact]}>{copy.requiredTitle}</Text>
      <Text style={styles.body}>{featureCopy}</Text>
      {!verified ? (
        awaitingOfficer ? (
          <>
            <Text style={styles.note}>{copy.verificationPendingTitle}</Text>
            <Text style={styles.note}>{copy.verificationPendingNote}</Text>
          </>
        ) : (
          <>
            <Text style={styles.note}>{copy.verificationRequiredNote}</Text>
            <Pressable style={styles.button} onPress={handleUpgrade}>
              <Text style={styles.buttonText}>{copy.completeVerificationFirst}</Text>
            </Pressable>
          </>
        )
      ) : (
        <>
          <Text style={styles.note}>{copy.requiredNote}</Text>
          <Pressable style={styles.button} onPress={handleUpgrade}>
            <Text style={styles.buttonText}>{copy.viewPlans}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    padding: 16,
  },
  cardCompact: {
    padding: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#78350f",
  },
  titleCompact: {
    fontSize: 15,
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#92400e",
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#b45309",
  },
  button: {
    marginTop: 14,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
