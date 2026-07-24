import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { fillMessageTemplate, tProfileAccountStatus } from "../i18n/messages";
import { getApiErrorMessage } from "../lib/api-error";
import type { AppLocale } from "../lib/locale";
import { pauseMyProfile, reactivateMyProfile } from "../services/profile-pause";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";

type Props = {
  locale: AppLocale;
  isPaused: boolean;
  pausedAt?: string | null;
  onStatusChange?: (isPaused: boolean) => void;
};

export function ProfileAccountStatusPanel({
  locale,
  isPaused,
  pausedAt,
  onStatusChange,
}: Props) {
  const copy = tProfileAccountStatus(locale);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPause, setConfirmPause] = useState(false);

  async function handlePause() {
    setBusy(true);
    setError(null);
    try {
      await pauseMyProfile();
      setConfirmPause(false);
      onStatusChange?.(true);
      await refreshSession();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.pauseFailed));
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate() {
    setBusy(true);
    setError(null);
    try {
      await reactivateMyProfile();
      onStatusChange?.(false);
      await refreshSession();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.reactivateFailed));
    } finally {
      setBusy(false);
    }
  }

  const pausedWhen =
    pausedAt && !Number.isNaN(new Date(pausedAt).getTime())
      ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(pausedAt))
      : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.description}>
        {isPaused ? copy.pausedDescription : copy.activeDescription}
      </Text>
      {isPaused && pausedWhen ? (
        <Text style={styles.pausedSince}>
          {fillMessageTemplate(copy.pausedSince, { when: pausedWhen })}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {isPaused ? (
          <Pressable
            style={[styles.reactivateButton, busy && styles.buttonDisabled]}
            onPress={() => void handleReactivate()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.reactivateText}>{copy.reactivate}</Text>
            )}
          </Pressable>
        ) : confirmPause ? (
          <>
            <Pressable
              style={[styles.confirmPauseButton, busy && styles.buttonDisabled]}
              onPress={() => void handlePause()}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmPauseText}>{copy.confirmPause}</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.cancelButton, busy && styles.buttonDisabled]}
              onPress={() => setConfirmPause(false)}
              disabled={busy}
            >
              <Text style={styles.cancelText}>{copy.cancel}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.pauseButton, busy && styles.buttonDisabled]}
            onPress={() => setConfirmPause(true)}
            disabled={busy}
          >
            <Text style={styles.pauseText}>{copy.pause}</Text>
          </Pressable>
        )}
      </View>

      {!isPaused && confirmPause ? (
        <Text style={styles.confirmHint}>{copy.pauseConfirmHint}</Text>
      ) : null}
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
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
  },
  pausedSince: {
    marginTop: 8,
    fontSize: 12,
    color: colors.zinc500,
  },
  error: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.red600,
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pauseButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pauseText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400e",
  },
  confirmPauseButton: {
    borderRadius: 10,
    backgroundColor: "#b45309",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 140,
    alignItems: "center",
  },
  confirmPauseText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  cancelButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.zinc100,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.zinc700,
  },
  reactivateButton: {
    borderRadius: 10,
    backgroundColor: colors.emerald600,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 160,
    alignItems: "center",
  },
  reactivateText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  confirmHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: "#92400e",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
