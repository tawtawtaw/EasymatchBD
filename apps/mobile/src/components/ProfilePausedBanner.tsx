import { Pressable, StyleSheet, Text, View } from "react-native";
import { tProfileAccountStatus } from "../i18n/messages";
import type { AppLocale } from "../lib/locale";
import { navigateToSettings } from "../navigation/nestedNavigation";
import { colors } from "../theme/colors";

type Props = {
  locale: AppLocale;
  showManageAction?: boolean;
};

export function ProfilePausedBanner({ locale, showManageAction = true }: Props) {
  const copy = tProfileAccountStatus(locale);

  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.title}>{copy.pausedBannerTitle}</Text>
      <Text style={styles.body}>{copy.pausedBannerBody}</Text>
      {showManageAction ? (
        <Pressable onPress={() => navigateToSettings()}>
          <Text style={styles.action}>{copy.pausedBannerAction}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PartnerPausedBanner({ locale }: { locale: AppLocale }) {
  const copy = tProfileAccountStatus(locale);

  return (
    <View style={styles.partnerBanner} accessibilityRole="text">
      <Text style={styles.partnerTitle}>{copy.partnerPausedTitle}</Text>
      <Text style={styles.partnerBody}>{copy.partnerPausedBody}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#78350f",
  },
  body: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#92400e",
  },
  action: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#78350f",
    textDecorationLine: "underline",
  },
  partnerBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.zinc50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  partnerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.zinc900,
  },
  partnerBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc600,
  },
});
