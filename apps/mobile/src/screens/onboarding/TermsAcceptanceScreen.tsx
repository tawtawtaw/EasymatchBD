import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppLogo } from "../../components/AppLogo";
import { TermsSectionBlock } from "../../components/TermsSectionBlock";
import { tOnboardingTerms } from "../../i18n/onboarding";
import { getApiErrorMessage } from "../../lib/api-error";
import { computeOnboardingPhase } from "../../lib/member-onboarding";
import type { TermsAcceptanceScreenProps } from "../../navigation/types";
import { acceptTerms, declineTerms, getPublishedTerms } from "../../services/onboarding";
import { enablePushNotificationsOnLogin } from "../../services/push-notifications";
import { useAuthStore } from "../../store/authStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

export default function TermsAcceptanceScreen({ navigation }: TermsAcceptanceScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tOnboardingTerms(locale);
  const bootstrap = useOnboardingStore((s) => s.bootstrap);
  const refresh = useOnboardingStore((s) => s.refresh);
  const signOut = useAuthStore((s) => s.signOut);
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState<Awaited<ReturnType<typeof getPublishedTerms>> | null>(
    null,
  );
  const termsLoadedRef = useRef(false);

  const loadTerms = useCallback(async () => {
    setError(null);
    try {
      setTerms(await getPublishedTerms(locale));
      termsLoadedRef.current = true;
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, locale]);

  useEffect(() => {
    if (!termsLoadedRef.current) {
      setLoading(true);
    }
    void loadTerms();
  }, [loadTerms]);

  const needsReaccept =
    Boolean(bootstrap?.termsVersion) &&
    bootstrap?.termsVersion !== bootstrap?.currentTermsVersion;

  async function handleAccept() {
    if (!terms) return;
    setBusy("accept");
    setError(null);
    try {
      await acceptTerms(terms.version);

      const currentBootstrap = useOnboardingStore.getState().bootstrap;
      if (currentBootstrap) {
        const nextBootstrap = {
          ...currentBootstrap,
          termsAccepted: true,
          termsVersion: terms.version,
          termsDeclinedAt: null,
        };
        useOnboardingStore.setState({
          bootstrap: nextBootstrap,
          phase: computeOnboardingPhase(nextBootstrap),
        });
      }

      await refresh(locale, { force: true });
      await useAuthStore.getState().refreshSession();
      await enablePushNotificationsOnLogin();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.acceptError));
    } finally {
      setBusy(null);
    }
  }

  async function handleDecline() {
    setBusy("decline");
    setError(null);
    try {
      await declineTerms();
      navigation.navigate("TermsDeclined");
    } catch (err) {
      setError(getApiErrorMessage(err, copy.declineError));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.rose800} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppLogo width={220} style={styles.logo} />
        <Text style={styles.title}>{copy.pageTitle}</Text>
        {terms?.effectiveDate ? (
          <Text style={styles.effectiveDate}>
            {copy.effectiveDate.replace("{date}", terms.effectiveDate)}
          </Text>
        ) : null}
        <Text style={styles.hint}>{copy.profileGateHint}</Text>

        {needsReaccept ? (
          <Text style={styles.notice}>
            {copy.updatedNotice
              .replace("{previous}", bootstrap?.termsVersion ?? "")
              .replace("{current}", bootstrap?.currentTermsVersion ?? terms?.version ?? "")}
          </Text>
        ) : null}

        {terms?.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <TermsSectionBlock section={section} />
          </View>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setReadConfirmed((v) => !v)}
          hitSlop={8}
        >
          <View style={[styles.checkbox, readConfirmed && styles.checkboxChecked]}>
            {readConfirmed ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.checkboxLabel}>{copy.readConfirm}</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, (!readConfirmed || busy) && styles.buttonDisabled]}
          disabled={!readConfirmed || busy !== null}
          onPress={() => void handleAccept()}
        >
          <Text style={styles.primaryButtonText}>
            {busy === "accept" ? copy.accepting : copy.agree}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, busy && styles.buttonDisabled]}
          disabled={busy !== null}
          onPress={() => void handleDecline()}
        >
          <Text style={styles.secondaryButtonText}>
            {busy === "decline" ? copy.declining : copy.decline}
          </Text>
        </Pressable>

        <Text style={styles.note}>{copy.declineNote}</Text>
        {terms ? (
          <Text style={styles.version}>
            {copy.version.replace("{version}", terms.version)}
          </Text>
        ) : null}

        <Pressable style={styles.signOutButton} onPress={() => void signOut()}>
          <Text style={styles.signOutText}>{copy.signOut}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.rose50 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.rose50,
  },
  content: { padding: 20, paddingBottom: 40 },
  logo: { alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: colors.zinc900 },
  effectiveDate: { marginTop: 6, fontSize: 13, color: colors.zinc600 },
  hint: { marginTop: 10, fontSize: 14, lineHeight: 20, color: colors.zinc700 },
  notice: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fffbeb",
    color: "#92400e",
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rose100,
  },
  checkboxRow: { flexDirection: "row", gap: 12, marginTop: 20, alignItems: "flex-start" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.zinc500,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.rose800, borderColor: colors.rose800 },
  checkmark: { color: colors.white, fontWeight: "700" },
  checkboxLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.zinc900 },
  primaryButton: {
    marginTop: 16,
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
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  secondaryButtonText: { color: colors.rose800, fontWeight: "700", fontSize: 16 },
  note: { marginTop: 12, fontSize: 12, lineHeight: 18, color: colors.zinc600 },
  version: { marginTop: 8, fontSize: 11, color: colors.zinc500, textAlign: "center" },
  signOutButton: { marginTop: 20, alignItems: "center", paddingVertical: 8 },
  signOutText: { fontSize: 14, fontWeight: "600", color: colors.zinc500 },
  error: { marginTop: 12, color: colors.red600, fontSize: 13 },
});
