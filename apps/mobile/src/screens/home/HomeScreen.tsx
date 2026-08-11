import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import { useMemberProfileStore } from "../../store/memberProfileStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import { useMemberAlertsStore } from "../../store/memberAlertsStore";
import type { MemberHomeBootstrap, SavedProfileItem } from "../../types/discovery";
import { colors } from "../../theme/colors";
import { cardShadow } from "../../theme/shadows";

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
      const summary = memberProfileSummaryFromHomeBootstrap(data.profile);
      setBootstrap(data);
      setSavedProfiles(saved);
      setMemberProfile(summary);
      // Keeps the header avatar in sync without a second fetch of its own.
      useMemberProfileStore.getState().setSummary(summary);

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
          size={101}
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
            accent={colors.rose700}
            icon="account-heart-outline"
            onPress={() =>
              navigation.navigate("Connections", { initialTab: "incoming" satisfies ConnectionsTabKey })
            }
          />
          <StatCard
            label={copy.sent}
            value={String(stats.outgoing)}
            accent={colors.tabDiscovery}
            icon="send-outline"
            onPress={() =>
              navigation.navigate("Connections", { initialTab: "outgoing" satisfies ConnectionsTabKey })
            }
          />
          <StatCard
            label={copy.connected}
            value={String(stats.connections)}
            accent={colors.emerald600}
            icon="account-multiple-outline"
            onPress={() =>
              navigation.navigate("Connections", { initialTab: "connected" satisfies ConnectionsTabKey })
            }
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionTitle icon="star-four-points-outline" title={copy.suggestedProfiles} />
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
          <SectionTitle icon="bookmark-outline" title={copy.savedProfiles} inline />
          {savedProfiles.length > 0 ? (
            <Pressable
              style={({ pressed }) => pressed && styles.linkPressed}
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
  accent,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  accent: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.statCard, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={18} color={accent} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    </Pressable>
  );
}

function SectionTitle({
  icon,
  title,
  inline,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  inline?: boolean;
}) {
  return (
    <View style={[styles.sectionTitleRow, inline && styles.sectionTitleRowInline]}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.rose800} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
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
    fontSize: 26,
    fontWeight: "800",
    color: colors.zinc900,
    lineHeight: 32,
  },
  profileCode: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc500,
  },
  error: { marginTop: 12, color: colors.red600, fontSize: 13 },
  upsellWrap: { marginTop: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.rose100,
    ...cardShadow,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  statLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc600,
  },
  statValue: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: "800",
  },
  section: { marginTop: 24 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  sectionTitleRowInline: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.zinc900,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.rose800,
  },
  linkPressed: {
    opacity: 0.6,
  },
  muted: { fontSize: 14, lineHeight: 20, color: colors.zinc600 },
});
