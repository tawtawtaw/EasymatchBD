import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tAppLock } from "../i18n/app-lock";
import { useActiveRouteName } from "../navigation/active-route";
import {
  authenticateWithBiometrics,
  getLockoutRemainingMs,
  verifyPin,
  PIN_MAX_LENGTH,
} from "../services/app-lock";
import { useAppLockStore } from "../store/appLockStore";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

/** Answering a call must not require unlocking first, the way phones behave. */
const LOCK_EXEMPT_ROUTES = new Set(["VideoCallRoom"]);

export function AppLockGate() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tAppLock(locale);
  const signedIn = useAuthStore((s) => Boolean(s.user));
  const enabled = useAppLockStore((s) => s.enabled);
  const isLocked = useAppLockStore((s) => s.isLocked);
  const biometricEnabled = useAppLockStore((s) => s.biometricEnabled);
  const biometricKind = useAppLockStore((s) => s.biometricKind);
  const unlock = useAppLockStore((s) => s.unlock);
  const routeName = useActiveRouteName();

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const biometricAskedFor = useRef(false);

  const visible =
    signedIn && enabled && isLocked && !LOCK_EXEMPT_ROUTES.has(routeName ?? "");

  const runBiometric = useCallback(async () => {
    const ok = await authenticateWithBiometrics(
      copy.biometricPrompt,
      copy.biometricFallback,
    );
    if (ok) {
      setPin("");
      setError(null);
      unlock();
    }
  }, [copy.biometricPrompt, copy.biometricFallback, unlock]);

  useEffect(() => {
    if (!visible) {
      biometricAskedFor.current = false;
      setPin("");
      setError(null);
      return;
    }
    if (biometricAskedFor.current || !biometricEnabled) return;
    biometricAskedFor.current = true;
    void runBiometric();
  }, [visible, biometricEnabled, runBiometric]);

  useEffect(() => {
    if (!visible) return;
    void (async () => {
      setLockoutSeconds(Math.ceil((await getLockoutRemainingMs()) / 1000));
    })();
  }, [visible]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  async function handleUnlock() {
    if (busy || lockoutSeconds > 0) return;

    setBusy(true);
    try {
      const result = await verifyPin(pin);
      if (result.status === "ok") {
        setPin("");
        setError(null);
        unlock();
        return;
      }
      if (result.status === "unset") {
        unlock();
        return;
      }
      if (result.status === "locked") {
        const seconds = Math.ceil(result.retryInMs / 1000);
        setLockoutSeconds(seconds);
        setError(copy.lockedOut.replace("{seconds}", String(seconds)));
        setPin("");
        return;
      }
      setError(
        copy.wrongPin.replace("{count}", String(Math.max(0, result.remainingAttempts))),
      );
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  const biometricLabel =
    biometricKind === "face" ? copy.useBiometricFace : copy.useBiometric;

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          <Text style={styles.title}>{copy.lockTitle}</Text>
          <Text style={styles.subtitle}>{copy.lockSubtitle}</Text>

          <Text style={styles.label}>{copy.pinLabel}</Text>
          <TextInput
            value={pin}
            onChangeText={(value) => {
              setPin(value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH));
              setError(null);
            }}
            keyboardType="number-pad"
            secureTextEntry
            autoFocus={!biometricEnabled}
            editable={!busy && lockoutSeconds === 0}
            style={styles.input}
            placeholder="••••"
            placeholderTextColor={colors.zinc500}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[
              styles.primaryButton,
              (busy || lockoutSeconds > 0) && styles.buttonDisabled,
            ]}
            onPress={() => void handleUnlock()}
            disabled={busy || lockoutSeconds > 0}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {lockoutSeconds > 0
                  ? copy.lockedOut.replace("{seconds}", String(lockoutSeconds))
                  : copy.unlock}
              </Text>
            )}
          </Pressable>

          {biometricEnabled ? (
            <Pressable style={styles.secondaryButton} onPress={() => void runBiometric()}>
              <Text style={styles.secondaryButtonText}>{biometricLabel}</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.textButton}
            onPress={() => void useAuthStore.getState().signOut()}
          >
            <Text style={styles.textButtonLabel}>{copy.signOutInstead}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.rose50,
    zIndex: 100,
    elevation: 100,
  },
  safe: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.zinc900,
  },
  subtitle: {
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
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    color: colors.zinc900,
    backgroundColor: colors.white,
  },
  error: {
    marginTop: 12,
    color: colors.red600,
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.rose800,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    color: colors.rose800,
    fontSize: 16,
    fontWeight: "700",
  },
  textButton: {
    marginTop: 18,
    alignItems: "center",
    paddingVertical: 6,
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.zinc500,
    textDecorationLine: "underline",
  },
});
