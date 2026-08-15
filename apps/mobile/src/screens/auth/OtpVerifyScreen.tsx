import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthScreenHeader } from "../../components/AuthScreenHeader";
import { LanguageToggle } from "../../components/LanguageToggle";
import { tAuthVerify } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import type { OtpVerifyScreenProps } from "../../navigation/types";
import { verifyOtp } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

export default function OtpVerifyScreen({ navigation, route }: OtpVerifyScreenProps) {
  const { phone, devOtp } = route.params;
  const locale = useLocaleStore((s) => s.locale);
  const copy = tAuthVerify(locale);
  const setFromAuthResponse = useAuthStore((s) => s.setFromAuthResponse);
  const [code, setCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (code.trim().length !== 6) {
      setError(copy.codeRequired);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await verifyOtp(phone, code.trim(), rememberDevice);
      await setFromAuthResponse(result.user);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.verifyError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "android" ? "height" : "padding"}
      >
        <LanguageToggle compact />

        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>{copy.back}</Text>
        </Pressable>

        <AuthScreenHeader logoWidth={220} />

        <View style={styles.card}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.hint}>{copy.hint.replace("{phone}", phone)}</Text>

          {devOtp ? (
            <View style={styles.devBox}>
              <Text style={styles.devLabel}>{copy.devOtp}</Text>
              <Text style={styles.devCode}>{devOtp}</Text>
            </View>
          ) : null}

          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            editable={!loading}
          />

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRememberDevice((current) => !current)}
          >
            <View style={[styles.checkbox, rememberDevice && styles.checkboxChecked]}>
              {rememberDevice ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.rememberText}>{copy.rememberDevice}</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>{copy.verify}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  back: {
    marginBottom: 8,
  },
  backText: {
    color: colors.rose800,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.rose100,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.zinc900,
  },
  hint: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
  },
  devBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  devLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  devCode: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 4,
    color: "#78350f",
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    color: colors.zinc900,
    backgroundColor: colors.white,
  },
  rememberRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.zinc500,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.rose800,
    borderColor: colors.rose800,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  rememberText: {
    color: colors.zinc700,
    fontSize: 14,
  },
  error: {
    marginTop: 12,
    color: colors.red600,
    fontSize: 13,
  },
  button: {
    marginTop: 24,
    backgroundColor: colors.rose800,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
