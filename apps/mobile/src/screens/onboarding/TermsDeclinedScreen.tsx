import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tOnboardingTerms } from "../../i18n/onboarding";
import type { TermsDeclinedScreenProps } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

export default function TermsDeclinedScreen({ navigation }: TermsDeclinedScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tOnboardingTerms(locale);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>{copy.declinedTitle}</Text>
        <Text style={styles.message}>{copy.declinedMessage}</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("TermsAcceptance")}>
          <Text style={styles.primaryButtonText}>{copy.reviewAgain}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <Text style={styles.secondaryButtonText}>{copy.signOut}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.rose50 },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: colors.zinc900, textAlign: "center" },
  message: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: colors.zinc700,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  primaryButtonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  secondaryButtonText: { color: colors.rose800, fontWeight: "700", fontSize: 16 },
});
