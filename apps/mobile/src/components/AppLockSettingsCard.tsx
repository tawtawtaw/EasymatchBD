import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { tAppLock } from "../i18n/app-lock";
import type { AppLocale } from "../lib/locale";
import {
  verifyPin,
  validatePinFormat,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
} from "../services/app-lock";
import { useAppLockStore } from "../store/appLockStore";
import { colors } from "../theme/colors";

type Mode = "create" | "change" | "disable";

function PinField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(next) => onChange(next.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH))}
        keyboardType="number-pad"
        secureTextEntry
        autoFocus={autoFocus}
        style={styles.input}
        placeholder="••••"
        placeholderTextColor={colors.zinc500}
      />
    </View>
  );
}

export function AppLockSettingsCard({ locale }: { locale: AppLocale }) {
  const copy = tAppLock(locale);
  const enabled = useAppLockStore((s) => s.enabled);
  const biometricEnabled = useAppLockStore((s) => s.biometricEnabled);
  const biometricAvailable = useAppLockStore((s) => s.biometricAvailable);
  const biometricKind = useAppLockStore((s) => s.biometricKind);
  const enableLock = useAppLockStore((s) => s.enableLock);
  const disableLock = useAppLockStore((s) => s.disableLock);
  const changeBiometric = useAppLockStore((s) => s.changeBiometric);

  const [mode, setMode] = useState<Mode | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openMode(next: Mode) {
    setMode(next);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError(null);
  }

  function closeModal() {
    setMode(null);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError(null);
  }

  function formatError(problem: ReturnType<typeof validatePinFormat>) {
    if (problem === "length") {
      return copy.errorLength
        .replace("{min}", String(PIN_MIN_LENGTH))
        .replace("{max}", String(PIN_MAX_LENGTH));
    }
    if (problem === "digits") return copy.errorDigits;
    return copy.errorWeak;
  }

  async function handleSubmit() {
    if (!mode || busy) return;

    setBusy(true);
    setError(null);
    try {
      if (mode === "change" || mode === "disable") {
        const check = await verifyPin(currentPin);
        if (check.status === "locked") {
          setError(
            copy.lockedOut.replace("{seconds}", String(Math.ceil(check.retryInMs / 1000))),
          );
          return;
        }
        if (check.status !== "ok") {
          setError(
            copy.wrongPin.replace(
              "{count}",
              String(check.status === "wrong" ? Math.max(0, check.remainingAttempts) : 0),
            ),
          );
          return;
        }
      }

      if (mode === "disable") {
        await disableLock();
        closeModal();
        return;
      }

      const problem = validatePinFormat(newPin);
      if (problem) {
        setError(formatError(problem));
        return;
      }
      if (newPin !== confirmPin) {
        setError(copy.mismatch);
        return;
      }

      await enableLock(newPin);
      closeModal();
    } catch {
      setError(copy.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  const biometricLabel =
    biometricKind === "face" ? copy.biometricToggleOnFace : copy.biometricToggleOn;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{copy.settingsTitle}</Text>
      <Text style={styles.hint}>{copy.settingsHint}</Text>
      <Text style={styles.meta}>{enabled ? copy.statusOn : copy.statusOff}</Text>

      {enabled ? (
        <>
          {biometricAvailable ? (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{biometricLabel}</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={(next) => void changeBiometric(next)}
                trackColor={{ false: colors.zinc100, true: colors.rose200 }}
                thumbColor={biometricEnabled ? colors.rose800 : colors.white}
              />
            </View>
          ) : (
            <Text style={styles.hint}>{copy.biometricUnavailable}</Text>
          )}

          <Pressable style={styles.secondaryButton} onPress={() => openMode("change")}>
            <Text style={styles.secondaryButtonText}>{copy.changePin}</Text>
          </Pressable>
          <Pressable style={styles.dangerButton} onPress={() => openMode("disable")}>
            <Text style={styles.dangerButtonText}>{copy.turnOff}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable style={styles.primaryButton} onPress={() => openMode("create")}>
          <Text style={styles.primaryButtonText}>{copy.turnOn}</Text>
        </Pressable>
      )}

      <Modal
        visible={mode !== null}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {mode === "disable" ? copy.turnOff : copy.setupTitle}
            </Text>
            <Text style={styles.hint}>
              {mode === "create"
                ? copy.setupHint
                    .replace("{min}", String(PIN_MIN_LENGTH))
                    .replace("{max}", String(PIN_MAX_LENGTH))
                : copy.currentPinHint}
            </Text>

            {mode !== "create" ? (
              <PinField
                label={copy.pinLabel}
                value={currentPin}
                onChange={setCurrentPin}
                autoFocus
              />
            ) : null}

            {mode !== "disable" ? (
              <>
                <PinField
                  label={copy.newPin}
                  value={newPin}
                  onChange={setNewPin}
                  autoFocus={mode === "create"}
                />
                <PinField
                  label={copy.confirmPin}
                  value={confirmPin}
                  onChange={setConfirmPin}
                />
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              onPress={() => void handleSubmit()}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === "disable" ? copy.turnOff : copy.save}
                </Text>
              )}
            </Pressable>
            <Pressable style={styles.textButton} onPress={closeModal}>
              <Text style={styles.textButtonLabel}>{copy.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc600,
  },
  meta: {
    marginTop: 8,
    fontSize: 14,
    color: colors.zinc700,
    fontWeight: "600",
  },
  switchRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.zinc800,
  },
  primaryButton: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 14,
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
  dangerButton: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    color: colors.red600,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  field: {
    marginTop: 14,
  },
  fieldLabel: {
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
    fontSize: 20,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(24,24,27,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.zinc900,
  },
  textButton: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 6,
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.zinc500,
  },
});
