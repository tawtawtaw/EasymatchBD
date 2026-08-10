import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppLockSettingsCard } from "../../components/AppLockSettingsCard";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { ProfileAccountStatusPanel } from "../../components/ProfileAccountStatusPanel";
import { ProfilePausedBanner } from "../../components/ProfilePausedBanner";
import { tAppLock } from "../../i18n/app-lock";
import { tMembership, tProfileHome, tProfileScreen, tSettingsScreen } from "../../i18n/messages";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { useMemberVerificationState } from "../../hooks/use-member-verification-state";
import { confirmSignOut } from "../../lib/confirm-sign-out";
import type { SettingsScreenProps } from "../../navigation/types";
import {
  inspectPushNotificationSetup,
  syncPushTokenRegistration,
  type PushSetupStatus,
} from "../../services/push-notifications";
import { useAppLockStore } from "../../store/appLockStore";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import type { AppLocale } from "../../lib/locale";
import { colors } from "../../theme/colors";

function notificationStatusText(
  copy: ReturnType<typeof tSettingsScreen>,
  status: PushSetupStatus | null,
) {
  if (!status) return copy.notificationsStatusChecking;
  if (status.apiRegistered) return copy.notificationsStatusReady;
  if (status.permission === "denied") return copy.notificationsStatusDenied;
  if (!status.expoToken) {
    return status.tokenError ?? copy.notificationsStatusNoToken;
  }
  return copy.notificationsStatusNotLinked;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const session = useAuthStore((s) => s.session);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const copy = tSettingsScreen(locale);
  const lockCopy = tAppLock(locale);
  const lockEnabled = useAppLockStore((s) => s.enabled);
  const lockNow = useAppLockStore((s) => s.lockNow);
  const profileCopy = tProfileHome(locale);
  const languageCopy = tProfileScreen(locale);
  const membershipCopy = tMembership(locale);
  const isPaid = useIsPaidMember();
  const { needsVerificationAction } = useMemberVerificationState();
  const isProfilePaused = Boolean(session?.isPaused);
  const [pushStatus, setPushStatus] = useState<PushSetupStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPushStatus = useCallback(async () => {
    if (!userId) {
      setPushStatus(null);
      return;
    }
    setPushStatus(await inspectPushNotificationSetup());
  }, [userId]);

  useEffect(() => {
    void refreshPushStatus();
  }, [refreshPushStatus]);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      await syncPushTokenRegistration();
      await refreshPushStatus();
    })();
  }, [userId, refreshPushStatus]);

  async function handleEnableNotifications() {
    setPushBusy(true);
    try {
      await syncPushTokenRegistration();
      await refreshPushStatus();
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>

      {isProfilePaused ? (
        <ProfilePausedBanner locale={locale} showManageAction={false} />
      ) : null}

      <ProfileAccountStatusPanel
        locale={locale}
        isPaused={isProfilePaused}
        pausedAt={session?.pausedAt}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{languageCopy.language}</Text>
        <Text style={styles.hint}>{copy.languageHint}</Text>
        <View style={styles.languageRow}>
          {(["en", "bn"] as AppLocale[]).map((option) => {
            const active = locale === option;
            const label = option === "en" ? languageCopy.english : languageCopy.bengali;
            return (
              <Pressable
                key={option}
                style={[styles.languageButton, active && styles.languageButtonActive]}
                onPress={() => void setLocale(option)}
              >
                <Text
                  style={[styles.languageButtonText, active && styles.languageButtonTextActive]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{profileCopy.membershipTitle}</Text>
        <Text style={styles.meta}>
          {isPaid ? profileCopy.membershipActive : profileCopy.membershipFree}
        </Text>
        <Text style={styles.hint}>{profileCopy.membershipDesc}</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Membership")}>
          <Text style={styles.primaryButtonText}>
            {isPaid ? membershipCopy.manageMembership : membershipCopy.viewMembership}
          </Text>
        </Pressable>
        {!isPaid ? (
          <View style={styles.gateWrap}>
            <PaidMembershipGate
              feature="connect"
              locale={locale}
              compact
              onVerifyRequired={
                needsVerificationAction
                  ? () => navigation.navigate("ProfileMedia")
                  : undefined
              }
            />
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{profileCopy.memberComplaints}</Text>
        <Text style={styles.hint}>{profileCopy.memberComplaintsDesc}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Complaints")}>
          <Text style={styles.secondaryButtonText}>{copy.openComplaints}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.notificationsTitle}</Text>
        <Text style={styles.hint}>{copy.notificationsHint}</Text>
        <Text style={styles.meta}>{notificationStatusText(copy, pushStatus)}</Text>
        {__DEV__ && pushStatus?.tokenError ? (
          <Text style={styles.debugText}>{pushStatus.tokenError}</Text>
        ) : null}
        {!pushStatus?.expoToken ? (
          <Text style={styles.setupHint}>
            {locale === "bn"
              ? "নতুন development build ইনস্টল করুন (google-services.json EAS-এ অন্তর্ভুক্ত থাকতে হবে)। Expo FCM V1 Firebase প্রজেক্ট easymatchbdtest থেকেই হতে হবে।"
              : "Install a fresh development build (google-services.json must be included in the EAS upload). Expo FCM V1 must be from the same Firebase project: easymatchbdtest."}
          </Text>
        ) : null}
        <Pressable
          style={[styles.secondaryButton, pushBusy && styles.buttonDisabled]}
          onPress={() => void handleEnableNotifications()}
          disabled={pushBusy}
        >
          {pushBusy ? (
            <ActivityIndicator color={colors.rose800} />
          ) : (
            <Text style={styles.secondaryButtonText}>
              {pushStatus?.apiRegistered ? copy.notificationsRetry : copy.notificationsEnable}
            </Text>
          )}
        </Pressable>
      </View>

      <AppLockSettingsCard locale={locale} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.sessionTitle}</Text>
        {lockEnabled ? (
          <>
            <Text style={styles.hint}>{lockCopy.lockAppHint}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => lockNow()}>
              <Text style={styles.secondaryButtonText}>{lockCopy.lockAppAction}</Text>
            </Pressable>
          </>
        ) : null}
        <Text style={[styles.hint, lockEnabled && styles.hintSpaced]}>
          {lockCopy.signOutHint}
        </Text>
        <Pressable style={styles.signOutButton} onPress={() => confirmSignOut(locale)}>
          <Text style={styles.signOutText}>{lockCopy.signOutTitle}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.zinc900,
  },
  subtitle: {
    fontSize: 14,
    color: colors.zinc600,
    lineHeight: 20,
    marginTop: -8,
  },
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
  hintSpaced: {
    marginTop: 18,
  },
  meta: {
    marginTop: 8,
    fontSize: 14,
    color: colors.zinc700,
    fontWeight: "600",
  },
  languageRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  languageButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose100,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  languageButtonActive: {
    backgroundColor: colors.rose800,
    borderColor: colors.rose800,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.rose800,
  },
  languageButtonTextActive: {
    color: colors.white,
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
  gateWrap: {
    marginTop: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  debugText: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    color: colors.red600,
    fontWeight: "600",
  },
  setupHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.zinc600,
  },
  signOutButton: {
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: {
    color: colors.red600,
    fontSize: 16,
    fontWeight: "700",
  },
});
