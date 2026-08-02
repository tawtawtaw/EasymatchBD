import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingState } from "../../components/ScreenState";
import { VerificationFeedbackPanel } from "../../components/VerificationFeedbackPanel";
import { tOnboardingProfileSetup } from "../../i18n/onboarding";
import { tProfileMedia } from "../../i18n/messages";
import { getCompletionMissingLabel } from "../../lib/completion-missing-labels";
import type { ProfileSetupScreenProps } from "../../navigation/types";
import { getVerificationFeedback } from "../../services/media";
import { shouldShowVerificationFeedback } from "../../lib/verification-feedback";
import { useLocaleStore } from "../../store/localeStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import type { VerificationFeedback } from "../../types/media";
import { colors } from "../../theme/colors";

export default function ProfileSetupScreen({ navigation }: ProfileSetupScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tOnboardingProfileSetup(locale);
  const mediaCopy = tProfileMedia(locale);
  const bootstrap = useOnboardingStore((s) => s.bootstrap);
  const refresh = useOnboardingStore((s) => s.refresh);
  const phase = useOnboardingStore((s) => s.phase);
  const [verificationFeedback, setVerificationFeedback] =
    useState<VerificationFeedback | null>(null);

  const completionPercent = bootstrap?.completionPercent ?? 0;
  const missing = bootstrap?.completionMissing ?? [];
  const canContinue = phase === "complete";

  useFocusEffect(
    useCallback(() => {
      void refresh(locale, { force: true });
      void getVerificationFeedback({ forceFresh: true })
        .then(setVerificationFeedback)
        .catch(() => setVerificationFeedback(null));
    }, [locale, refresh]),
  );

  if (!bootstrap) {
    return <LoadingState label={copy.loading} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        {bootstrap.profile?.profileCode ? (
          <Text style={styles.profileCode}>ID {bootstrap.profile.profileCode}</Text>
        ) : null}

        <Text style={styles.percent}>
          {copy.percentComplete.replace("{percent}", String(completionPercent))}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
        </View>

        {missing.length > 0 ? (
          <View style={styles.missingBox}>
            <Text style={styles.missingTitle}>{copy.stillNeeded}</Text>
            {missing.slice(0, 10).map((item) => (
              <Text key={item} style={styles.missingItem}>
                • {getCompletionMissingLabel(locale, item)}
              </Text>
            ))}
          </View>
        ) : null}

        {verificationFeedback && shouldShowVerificationFeedback(verificationFeedback) ? (
          <View style={styles.feedbackWrap}>
            <VerificationFeedbackPanel
              copy={mediaCopy}
              feedback={verificationFeedback}
              compact
              hideAlertHistory
            />
          </View>
        ) : null}

        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate("EditPersonal")}
        >
          <Text style={styles.actionButtonText}>{copy.editPersonal}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("EditFamily")}
        >
          <Text style={styles.secondaryButtonText}>{copy.editFamily}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("EditMarital")}
        >
          <Text style={styles.secondaryButtonText}>{copy.editMarital}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("EditPartner")}
        >
          <Text style={styles.secondaryButtonText}>{copy.editPartner}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("ProfileMedia")}
        >
          <Text style={styles.secondaryButtonText}>{copy.editPhotos}</Text>
        </Pressable>

        {!canContinue ? (
          <Text style={styles.continueHint}>{copy.continueHint}</Text>
        ) : (
          <Pressable
            style={styles.primaryButton}
            onPress={() => void refresh(locale, { force: true })}
          >
            <Text style={styles.primaryButtonText}>{copy.continueToApp}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", color: colors.zinc900 },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.zinc600 },
  profileCode: { marginTop: 10, fontSize: 13, fontWeight: "600", color: colors.zinc500 },
  percent: { marginTop: 20, fontSize: 28, fontWeight: "800", color: colors.rose800 },
  progressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.rose100,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.rose800 },
  missingBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  missingTitle: { fontSize: 13, fontWeight: "700", color: "#92400e" },
  missingItem: {
    marginTop: 4,
    fontSize: 13,
    color: "#92400e",
    textTransform: "capitalize",
  },
  feedbackWrap: { marginTop: 16 },
  actionButton: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  secondaryButtonText: { color: colors.rose800, fontWeight: "700", fontSize: 16 },
  continueHint: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc600,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: colors.emerald600,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});
