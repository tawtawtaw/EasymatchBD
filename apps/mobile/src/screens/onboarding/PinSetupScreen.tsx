import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppLogo } from "../../components/AppLogo";
import { tAppLock } from "../../i18n/app-lock";
import { tOnboardingPinSetup } from "../../i18n/onboarding";
import { markPinSetupPromptSeen } from "../../lib/pin-setup-prompt";
import { validatePinFormat } from "../../services/app-lock";
import { useAppLockStore } from "../../store/appLockStore";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

const ONBOARDING_PIN_LENGTH = 4;

type PinSetupScreenProps = {
  onFinished: () => void;
};

export default function PinSetupScreen({ onFinished }: PinSetupScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tOnboardingPinSetup(locale);
  const lockCopy = tAppLock(locale);
  const userId = useAuthStore((s) => s.user?.id);
  const enableLock = useAppLockStore((s) => s.enableLock);
  const changeBiometric = useAppLockStore((s) => s.changeBiometric);
  const biometricAvailable = useAppLockStore((s) => s.biometricAvailable);
  const biometricKind = useAppLockStore((s) => s.biometricKind);

  const refreshLock = useAppLockStore((s) => s.refresh);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [useBiometric, setUseBiometric] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshLock();
  }, [refreshLock]);

  useEffect(() => {
    if (biometricAvailable) setUseBiometric(true);
  }, [biometricAvailable]);

  const biometricLabel =
    biometricKind === "face"
      ? lockCopy.biometricToggleOnFace
      : biometricKind === "fingerprint"
        ? lockCopy.biometricToggleOn
        : lockCopy.biometricToggleOnGeneric;

  function formatError(problem: ReturnType<typeof validatePinFormat>) {
    if (problem === "length") return copy.errorLength;
    if (problem === "digits") return copy.errorDigits;
    return copy.errorWeak;
  }

  async function finishWithoutPin() {
    if (userId) {
      await markPinSetupPromptSeen(userId);
    }
    onFinished();
  }

  async function handleSave() {
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      if (pin.length !== ONBOARDING_PIN_LENGTH) {
        setError(copy.errorLength);
        return;
      }
      const problem = validatePinFormat(pin);
      if (problem) {
        setError(formatError(problem));
        return;
      }
      if (pin !== confirmPin) {
        setError(copy.mismatch);
        return;
      }

      await enableLock(pin);
      if (biometricAvailable) {
        await changeBiometric(useBiometric);
      }
      onFinished();
    } catch {
      setError(copy.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "android" ? "height" : "padding"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <AppLogo width={220} style={styles.logo} />
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{copy.pinLabel}</Text>
            <TextInput
              value={pin}
              onChangeText={(next) =>
                setPin(next.replace(/\D/g, "").slice(0, ONBOARDING_PIN_LENGTH))
              }
              keyboardType="number-pad"
              secureTextEntry
              autoFocus
              maxLength={ONBOARDING_PIN_LENGTH}
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={colors.zinc500}
            />

            <Text style={[styles.fieldLabel, styles.confirmLabel]}>
              {copy.confirmPin}
            </Text>
            <TextInput
              value={confirmPin}
              onChangeText={(next) =>
                setConfirmPin(next.replace(/\D/g, "").slice(0, ONBOARDING_PIN_LENGTH))
              }
              keyboardType="number-pad"
              secureTextEntry
              maxLength={ONBOARDING_PIN_LENGTH}
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={colors.zinc500}
            />

            {biometricAvailable ? (
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.switchLabel}>{biometricLabel}</Text>
                  <Text style={styles.switchHint}>{copy.biometricHint}</Text>
                </View>
                <Switch
                  value={useBiometric}
                  onValueChange={setUseBiometric}
                  trackColor={{ false: colors.zinc100, true: colors.rose200 }}
                  thumbColor={useBiometric ? colors.rose800 : colors.white}
                />
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              onPress={() => void handleSave()}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{copy.save}</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.skipButton}
              onPress={() => void finishWithoutPin()}
              disabled={busy}
            >
              <Text style={styles.skipButtonText}>{copy.skip}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.rose50 },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  logo: { alignSelf: "center", marginBottom: 16 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.zinc900,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
    textAlign: "center",
  },
  card: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    padding: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc800,
    marginBottom: 8,
  },
  confirmLabel: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
    color: colors.zinc900,
    backgroundColor: colors.white,
  },
  switchRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchCopy: { flex: 1 },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.zinc800,
  },
  switchHint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc600,
  },
  error: { marginTop: 12, color: colors.red600, fontSize: 13 },
  primaryButton: {
    marginTop: 18,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  skipButton: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.zinc500,
  },
});
