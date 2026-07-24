import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { DiscoveryProfileCard } from "../../components/DiscoveryProfileCard";
import { MemberProfileAvatar } from "../../components/MemberProfileAvatar";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { EmptyState, ErrorState, LoadingState } from "../../components/ScreenState";
import { tHomeScreen, tSavedProfiles } from "../../i18n/messages";
import { confirmSignOut } from "../../lib/confirm-sign-out";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { getApiErrorMessage } from "../../lib/api-error";
import { navigateToDiscoveryProfile } from "../../navigation/nestedNavigation";
import type { ConnectionsTabKey, MainTabParamList } from "../../navigation/types";
import {
  getMemberHomeBootstrap,
  listSavedProfiles,
} from "../../services/discovery";
import {
  memberProfileSummaryFromHomeBootstrap,
  resolveMemberProfileDisplayName,
  type MemberProfileSummary,
} from "../../services/member-profile";
import { useLocaleStore } from "../../store/localeStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import { useMemberAlertsStore } from "../../store/memberAlertsStore";
import type { MemberHomeBootstrap, SavedProfileItem } from "../../types/discovery";
import { colors } from "../../theme/colors";

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const locale = useLocaleStore((s) => s.locale);
  const isPaid = useIsPaidMember();
  const copy = tHomeScreen(locale);
  const savedCopy = tSavedProfiles(locale);
  const refreshOnboarding = useOnboardingStore((s) => s.refresh);
  const liveIncoming = useMemberAlertsStore((s) => s.incomingInterests);
  const liveOutgoing = useMemberAlertsStore((s) => s.outgoingInterests);
  const liveConnections = useMemberAlertsStore((s) => s.connections);
  const alertsSynced = useMemberAlertsStore((s) => s.alertsSynced);
  const [bootstrap, setBootstrap] = useState<MemberHomeBootstrap | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfileItem[]>([]);
  const [memberProfile, setMemberProfile] = useState<MemberProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (options?: { refresh?: boolean; silent?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const [data, saved] = await Promise.all([
        getMemberHomeBootstrap(),
        listSavedProfiles({ forceFresh: options?.refresh === true }).catch(
          () => [] as SavedProfileItem[],
        ),
      ]);
      setBootstrap(data);
      setSavedProfiles(saved);
      setMemberProfile(memberProfileSummaryFromHomeBootstrap(data.profile));

      if (!data.termsAccepted) {
        await refreshOnboarding(locale);
        return;
      }

      if (!data.profile?.isVerified) {
        navigation.navigate("Discovery", { screen: "DiscoveryList" });
        return;
      }
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.loadError, locale, navigation, refreshOnboarding]);

  useFocusEffect(
    useCallback(() => {
      void load({ refresh: true, silent: hasLoadedRef.current });
      hasLoadedRef.current = true;
    }, [load]),
  );

  if (loading && !refreshing) {
    return <LoadingState label={copy.loading} />;
  }

  const suggestions = bootstrap?.suggestions ?? [];
  const savedPreview = savedProfiles.slice(0, 3);
  const stats = alertsSynced
    ? {
        incoming: liveIncoming,
        outgoing: liveOutgoing,
        connections: liveConnections,
      }
    : {
        incoming: bootstrap?.stats.incoming ?? 0,
        outgoing: bootstrap?.stats.outgoing ?? 0,
        connections: bootstrap?.stats.connections ?? 0,
      };
  const displayName = resolveMemberProfileDisplayName(
    memberProfile ??
      (bootstrap?.profile
        ? {
            fullName: bootstrap.profile?.fullName ?? null,
            profileCode: bootstrap.profile?.profileCode ?? null,
          }
        : null),
    copy.fallbackName,
  );
  const primaryPhotoId =
    memberProfile?.primaryPhotoId ?? bootstrap?.profile?.primaryPhotoId ?? null;
  const profileFullName = memberProfile?.fullName ?? bootstrap?.profile?.fullName ?? null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load({ refresh: true })} />
      }
    >
      <View style={styles.hero}>
        <MemberProfileAvatar
          photoId={primaryPhotoId}
          name={profileFullName}
          gender={memberProfile?.gender}
          size={72}
        />
        <View style={styles.heroText}>
          <Text style={styles.greeting}>
            {copy.greeting.replace("{name}", displayName)}
          </Text>
          {memberProfile?.profileCode || bootstrap?.profile?.profileCode ? (
            <Text style={styles.profileCode}>
              ID {memberProfile?.profileCode ?? bootstrap?.profile?.profileCode}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.accountRow}>
        <Pressable
          style={styles.accountSettingsButton}
          onPress={() => {
            navigation.navigate("Profile", { screen: "Settings" });
          }}
        >
          <Text style={styles.accountSettingsText}>{copy.accountSettings}</Text>
          <Text style={styles.accountSettingsHint}>{copy.manageAccountHint}</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={() => confirmSignOut(locale)}>
          <Text style={styles.signOutText}>{copy.signOut}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!isPaid ? (
        <View style={styles.upsellWrap}>
          <PaidMembershipGate feature="connect" locale={locale} compact />
        </View>
      ) : null}

      {bootstrap ? (
        <View style={styles.statsRow}>
          <StatCard
            label={copy.incoming}
            value={String(stats.incoming)}
            onPress={() =>
              navigation.navigate("Connections", { initialTab: "incoming" satisfies ConnectionsTabKey })
            }
          />
          <StatCard
            label={copy.sent}
            value={String(stats.outgoing)}
            onPress={() =>
              navigation.navigate("Connections", { initialTab: "outgoing" satisfies ConnectionsTabKey })
            }
          />
          <StatCard
            label={copy.connected}
            value={String(stats.connections)}
            onPress={() =>
              navigation.navigate("Connections", { initialTab: "connected" satisfies ConnectionsTabKey })
            }
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.suggestedProfiles}</Text>
        {suggestions.length === 0 ? (
          <Text style={styles.muted}>{copy.emptySuggestions}</Text>
        ) : (
          suggestions.slice(0, 5).map((item) => (
            <DiscoveryProfileCard
              key={item.profileId}
              item={item}
              onPress={() =>
                navigateToDiscoveryProfile(navigation, {
                  profileId: item.profileId,
                  profileCode: item.profileCode,
                })
              }
            />
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleInline}>{copy.savedProfiles}</Text>
          {savedProfiles.length > 0 ? (
            <Pressable
              onPress={() =>
                navigation.navigate("Discovery", { screen: "SavedProfiles" })
              }
            >
              <Text style={styles.viewAll}>{copy.viewAllSaved}</Text>
            </Pressable>
          ) : null}
        </View>
        {savedPreview.length === 0 ? (
          <Text style={styles.muted}>{copy.emptySavedProfiles}</Text>
        ) : (
          savedPreview.map((item) => (
            <DiscoveryProfileCard
              key={item.profileId}
              item={item}
              bookmarkedLabel={savedCopy.bookmarked}
              onPress={() =>
                navigateToDiscoveryProfile(navigation, {
                  profileId: item.profileId,
                  profileCode: item.profileCode,
                })
              }
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 20, paddingBottom: 32 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.zinc900,
    lineHeight: 28,
  },
  profileCode: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc500,
  },
  accountRow: {
    marginTop: 14,
    gap: 10,
  },
  accountSettingsButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    padding: 14,
  },
  accountSettingsText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.rose800,
  },
  accountSettingsHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.zinc500,
  },
  signOutButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.red600,
    textDecorationLine: "underline",
  },
  error: { marginTop: 12, color: colors.red600, fontSize: 13 },
  upsellWrap: { marginTop: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.rose100,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.zinc500,
    textTransform: "uppercase",
  },
  statValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "800",
    color: colors.zinc900,
  },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  sectionTitleInline: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
    marginBottom: 0,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.rose800,
  },
  muted: { fontSize: 14, lineHeight: 20, color: colors.zinc600 },
});
