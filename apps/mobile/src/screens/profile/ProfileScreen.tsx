import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LoadingState } from "../../components/ScreenState";
import { MemberProfileAvatar } from "../../components/MemberProfileAvatar";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { VerificationFeedbackPanel } from "../../components/VerificationFeedbackPanel";
import { ProfilePausedBanner } from "../../components/ProfilePausedBanner";
import { tProfileHome, tMembership, tProfileMedia } from "../../i18n/messages";
import { getCompletionMissingLabel } from "../../lib/completion-missing-labels";
import { useMemberVerificationState } from "../../hooks/use-member-verification-state";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { membershipPlanLabel } from "../../lib/membership-labels";
import { getApiErrorMessage } from "../../lib/api-error";
import type { ProfileHomeScreenProps } from "../../navigation/types";
import { getProfileEditorBootstrap } from "../../services/profile";
import { getVerificationFeedback } from "../../services/media";
import {
  memberProfileSummaryFromEditorBootstrap,
  resolveMemberProfileDisplayName,
  type MemberProfileSummary,
} from "../../services/member-profile";
import { getMembershipTariffs } from "../../services/membership";
import type { MembershipTariff } from "@easymatch/shared";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import type { VerificationFeedback } from "../../types/media";
import { shouldShowVerificationFeedback } from "../../lib/verification-feedback";
import { colors } from "../../theme/colors";

export default function ProfileScreen({ navigation }: ProfileHomeScreenProps) {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const locale = useLocaleStore((s) => s.locale);
  const copy = tProfileHome(locale);
  const membershipCopy = tMembership(locale);
  const mediaCopy = tProfileMedia(locale);
  const isPaid = useIsPaidMember();
  const { needsVerificationAction } = useMemberVerificationState();
  const [completionPercent, setCompletionPercent] = useState(user?.completionPercent ?? 0);
  const [missing, setMissing] = useState<string[]>(user?.completionMissing ?? []);
  const [memberProfile, setMemberProfile] = useState<MemberProfileSummary | null>(null);
  const [verificationFeedback, setVerificationFeedback] =
    useState<VerificationFeedback | null>(null);
  const [tariffs, setTariffs] = useState<MembershipTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (options?: { refresh?: boolean; silent?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const [data, feedback, tariffData] = await Promise.all([
        getProfileEditorBootstrap(locale),
        getVerificationFeedback().catch(() => null),
        getMembershipTariffs().catch(() => []),
      ]);
      setMemberProfile(memberProfileSummaryFromEditorBootstrap(data));
      setTariffs(tariffData);
      setCompletionPercent(data.completionPercent ?? 0);
      setMissing(Array.isArray(data.completionMissing) ? data.completionMissing : []);
      setVerificationFeedback(feedback);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.loadError, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load({ silent: hasLoadedRef.current });
      hasLoadedRef.current = true;
    }, [load]),
  );

  const verified = session?.isVerified ?? user?.profile?.isVerified ?? false;
  const planCode = session?.subscription?.plan ?? user?.subscription?.plan ?? "free";
  const planLabel = membershipPlanLabel(planCode, tariffs, locale);
  const isProfilePaused = Boolean(session?.isPaused);
  const displayName =
    resolveMemberProfileDisplayName(memberProfile, "") ||
    user?.phone ||
    copy.fallbackName;

  if (loading && !refreshing) {
    return <LoadingState label={copy.loading} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load({ refresh: true })} />
      }
    >
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      {isProfilePaused ? (
        <View style={styles.feedbackWrap}>
          <ProfilePausedBanner locale={locale} />
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

      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <MemberProfileAvatar
            photoId={memberProfile?.primaryPhotoId}
            name={memberProfile?.fullName}
            gender={memberProfile?.gender}
            size={72}
          />
          <View style={styles.profileHeaderText}>
            <Text style={styles.label}>{copy.signedInAs}</Text>
            <Text style={styles.displayName}>{displayName}</Text>
          </View>
        </View>
        {memberProfile?.profileCode ? (
          <Text style={styles.meta}>
            {copy.yourProfileId}: {memberProfile.profileCode}
          </Text>
        ) : null}
        {memberProfile?.fullName?.trim() && user?.phone ? (
          <Text style={styles.meta}>{user.phone}</Text>
        ) : null}
        <Text style={styles.meta}>
          {copy.plan}: {planLabel}
          {isPaid ? ` · ${membershipCopy.paidActive}` : ""}
        </Text>
        <Text style={styles.meta}>
          {copy.verified}: {verified ? copy.yes : copy.pending}
        </Text>
        <Pressable
          style={styles.settingsButton}
          onPress={() => navigation.navigate("Settings")}
        >
          <Text style={styles.settingsButtonText}>{copy.openSettings}</Text>
        </Pressable>
        <Text style={styles.settingsHint}>{copy.settingsHint}</Text>
      </View>

      {!isPaid ? (
        <View style={styles.card}>
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.biodataCompletion}</Text>
        <Text style={styles.percent}>{completionPercent}%</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
        </View>
        {missing.length > 0 ? (
          <>
            <Text style={styles.missingTitle}>{copy.stillNeeded}:</Text>
            {missing.slice(0, 8).map((item) => (
              <Text key={item} style={styles.missingItem}>
                • {getCompletionMissingLabel(locale, item)}
              </Text>
            ))}
            {missing.length > 8 ? (
              <Text style={styles.missingItem}>
                • {copy.andMore.replace("{count}", String(missing.length - 8))}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.meta}>{copy.complete}</Text>
        )}

        <Pressable
          style={styles.editButton}
          onPress={() => navigation.navigate("EditPersonal")}
        >
          <Text style={styles.editButtonText}>{copy.editPersonal}</Text>
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
        {isPaid ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("BiodataExport")}
          >
            <Text style={styles.secondaryButtonText}>{copy.exportBiodata}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc500,
    textTransform: "uppercase",
  },
  displayName: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "800",
    color: colors.zinc900,
  },
  meta: {
    marginTop: 6,
    fontSize: 14,
    color: colors.zinc600,
    textTransform: "capitalize",
  },
  settingsButton: {
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  settingsButtonText: {
    color: colors.rose800,
    fontSize: 15,
    fontWeight: "700",
  },
  settingsHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: colors.zinc500,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  percent: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: colors.rose800,
  },
  progressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.rose100,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.rose800,
  },
  missingTitle: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: "700",
    color: colors.zinc800,
  },
  missingItem: {
    marginTop: 4,
    fontSize: 13,
    color: colors.zinc600,
    textTransform: "capitalize",
  },
  editButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  editButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
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
  secondaryButtonText: {
    color: colors.rose800,
    fontSize: 16,
    fontWeight: "700",
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
  feedbackWrap: {
    marginBottom: 12,
  },
});
