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
import { tAuthLogin } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import { isValidBangladeshPhone } from "../../lib/phone";
import { sendOtp, tryTrustedDeviceSignIn } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";
import type { OtpLoginScreenProps } from "../../navigation/types";

function validatePhone(phone: string, copy: ReturnType<typeof tAuthLogin>): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return copy.phoneRequired;
  if (!isValidBangladeshPhone(trimmed)) return copy.phoneInvalid;
  return null;
}

export default function OtpLoginScreen({ navigation }: OtpLoginScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tAuthLogin(locale);
  const setFromAuthResponse = useAuthStore((s) => s.setFromAuthResponse);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    const validationError = validatePhone(phone, copy);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const trustedUser = await tryTrustedDeviceSignIn(phone.trim());
      if (trustedUser) {
        await setFromAuthResponse(trustedUser);
        return;
      }

      const result = await sendOtp(phone.trim());
      navigation.navigate("OtpVerify", {
        phone: result.phone,
        devOtp: result.devOtp,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.sendOtpError));
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

        <AuthScreenHeader brand={copy.brand} subtitle={copy.subtitle} logoSize={96} />

        <View style={styles.card}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.hint}>{copy.hint}</Text>

          <Text style={styles.label}>{copy.mobileLabel}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="01712345678"
            keyboardType="phone-pad"
            autoComplete="tel"
            style={styles.input}
            editable={!loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>{copy.sendOtp}</Text>
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
  label: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc800,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.zinc900,
    backgroundColor: colors.white,
  },
  error: {
    marginTop: 12,
    color: colors.red600,
    fontSize: 13,
  },
  button: {
    marginTop: 20,
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
