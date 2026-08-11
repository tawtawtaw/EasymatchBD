import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MIN_CONSULTANT_PRIVACY_LEVEL } from "@easymatch/shared";
import { ConnectionConsultantPanel } from "../../components/ConnectionConsultantPanel";
import { EmptyState, LoadingState } from "../../components/ScreenState";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { getApiErrorMessage } from "../../lib/api-error";
import { resolveMemberDisplayName, formatInterestProfileMeta } from "../../lib/member-display";
import { getDropdowns } from "../../services/dropdowns";
import type { DropdownMap } from "../../types/dropdowns";
import type { AppLocale } from "../../lib/locale";
import type { ConnectionsTabKey, MainTabParamList } from "../../navigation/types";
import {
  navigateToChatThread,
  navigateToDiscoveryProfile,
} from "../../navigation/nestedNavigation";
import {
  listInterests,
  listMyConnections,
  requestPrivacyUpgrade,
  respondDiscoveryInterest,
  respondPrivacyUpgrade,
  withdrawDiscoveryInterest,
} from "../../services/discovery";
import { useLocaleStore } from "../../store/localeStore";
import { useMemberAlertsStore } from "../../store/memberAlertsStore";
import { tConnectionsScreen, tPrivacyLevel } from "../../i18n/messages";
import type {
  ConnectionItem,
  IncomingInterest,
  InterestProfileSummary,
  OutgoingInterest,
} from "../../types/discovery";
import { colors } from "../../theme/colors";

type TabKey = ConnectionsTabKey;

function connectionProfileRef(member: ConnectionItem["member"]) {
  return member.profileCode ?? member.profileId ?? "";
}

function formatInterestDate(iso: string, locale: AppLocale) {
  return new Date(iso).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function interestDisplayName(
  profile: InterestProfileSummary | null | undefined,
  copy: ReturnType<typeof tConnectionsScreen>,
  hideNameUntilAccepted = false,
) {
  if (!profile) return copy.anonymousMember;
  return resolveMemberDisplayName(
    {
      fullName: hideNameUntilAccepted ? null : profile.fullName,
      profileCode: profile.profileCode,
    },
    undefined,
    {
      profileRef: (code) => copy.profileId.replace("{code}", code),
      member: copy.anonymousMember,
    },
  );
}

function profileMetaLine(
  profile: InterestProfileSummary | null | undefined,
  copy: ReturnType<typeof tConnectionsScreen>,
  suffix?: string,
) {
  const idLine = profile?.profileCode
    ? copy.profileId.replace("{code}", profile.profileCode)
    : null;
  if (idLine && suffix) return `${idLine} · ${suffix}`;
  return idLine ?? suffix ?? null;
}

export default function ConnectionsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, "Connections">>();
  const locale = useLocaleStore((s) => s.locale);
  const copy = tConnectionsScreen(locale);
  const privacyLabels = tPrivacyLevel(locale);
  const isPaid = useIsPaidMember();
  const [tab, setTab] = useState<TabKey>(route.params?.initialTab ?? "incoming");
  const [incoming, setIncoming] = useState<IncomingInterest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingInterest[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [privacyActingRef, setPrivacyActingRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openProfile = useCallback(
    (profile: InterestProfileSummary | null | undefined) => {
      if (!profile?.id || !profile.profileCode) return;
      navigateToDiscoveryProfile(navigation, {
        profileId: profile.id,
        profileCode: profile.profileCode,
      });
    },
    [navigation],
  );

  const openConnectedProfile = useCallback(
    (item: ConnectionItem) => {
      const profileId = item.member.profileId;
      const profileCode = item.member.profileCode;
      if (!profileId || !profileCode) return;
      navigateToDiscoveryProfile(navigation, {
        profileId,
        profileCode,
      });
    },
    [navigation],
  );

  const openChat = useCallback(
    (item: ConnectionItem, memberName: string) => {
      navigateToChatThread(navigation, {
        connectionId: item.connectionId,
        memberName,
        profileCode: item.member.profileCode,
      });
    },
    [navigation],
  );

  const load = useCallback(async (options?: { refresh?: boolean; silent?: boolean; forceFresh?: boolean }) => {
    if (options?.refresh) setRefreshing(true);
    else if (!options?.silent) setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const [interests, connectionList, dropdownData] = await Promise.all([
        listInterests({ forceFresh: options?.forceFresh || options?.refresh }),
        listMyConnections(),
        getDropdowns(locale),
      ]);
      setIncoming(Array.isArray(interests.incoming) ? interests.incoming : []);
      setOutgoing(Array.isArray(interests.outgoing) ? interests.outgoing : []);
      setConnections(Array.isArray(connectionList) ? connectionList : []);
      setDropdowns(dropdownData);
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
      void load({ silent: true, forceFresh: true });
    }, [load]),
  );

  useEffect(() => {
    if (route.params?.initialTab) {
      setTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  async function handleRespond(interestId: string, accept: boolean) {
    setActingId(interestId);
    setError(null);
    setSuccess(null);
    try {
      await respondDiscoveryInterest(interestId, accept);
      setIncoming((prev) => prev.filter((interest) => interest.id !== interestId));
      void useMemberAlertsStore.getState().refresh();
      await load({ refresh: true });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.respondError));
    } finally {
      setActingId(null);
    }
  }

  async function handleWithdraw(interestId: string) {
    setActingId(interestId);
    setError(null);
    setSuccess(null);
    try {
      await withdrawDiscoveryInterest(interestId);
      setOutgoing((prev) => prev.filter((interest) => interest.id !== interestId));
      await load({ refresh: true });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.withdrawError));
    } finally {
      setActingId(null);
    }
  }

  async function handleUpgrade(profileRef: string) {
    setPrivacyActingRef(profileRef);
    setError(null);
    setSuccess(null);
    try {
      const result = await requestPrivacyUpgrade(profileRef);
      setConnections((prev) =>
        prev.map((connection) => {
          if (connectionProfileRef(connection.member) !== profileRef) {
            return connection;
          }
          return {
            ...connection,
            pendingUpgradeLevel: result.pendingUpgradeLevel,
            pendingUpgradeByMe: true,
          };
        }),
      );
      setSuccess(copy.upgradeSuccess);
      await load({ refresh: true });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.upgradeError));
    } finally {
      setPrivacyActingRef(null);
    }
  }

  async function handlePrivacyRespond(profileRef: string, accept: boolean) {
    setPrivacyActingRef(profileRef);
    setError(null);
    setSuccess(null);
    try {
      const result = await respondPrivacyUpgrade(profileRef, accept);
      setConnections((prev) =>
        prev.map((connection) => {
          if (connectionProfileRef(connection.member) !== profileRef) {
            return connection;
          }
          if (accept) {
            return {
              ...connection,
              privacyLevel: result.privacyLevel,
              pendingUpgradeLevel: null,
              pendingUpgradeByMe: false,
            };
          }
          return {
            ...connection,
            pendingUpgradeLevel: null,
            pendingUpgradeByMe: false,
          };
        }),
      );
      setSuccess(copy.upgradeSuccess);
      await load({ refresh: true });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.upgradeError));
    } finally {
      setPrivacyActingRef(null);
    }
  }

  if (loading && !refreshing) {
    return <LoadingState label={copy.loading} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(
          [
            ["incoming", `${copy.tabIncoming} (${incoming.length})`],
            ["outgoing", `${copy.tabSent} (${outgoing.length})`],
            ["connected", `${copy.tabConnected} (${connections.length})`],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load({ refresh: true })} />
        }
      >
        {tab === "incoming" ? (
          incoming.length === 0 ? (
            <EmptyState message={copy.emptyIncoming} icon="account-heart-outline" />
          ) : (
            incoming.map((item) => {
              const profile = item.sender.profile;
              const name = interestDisplayName(profile, copy, true);
              const meta = profile?.fullName?.trim()
                ? profileMetaLine(profile, copy)
                : null;
              return (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.name}>{name}</Text>
                  {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                  {!profile?.fullName?.trim() ? (
                    <Text style={styles.hint}>{copy.incomingHint}</Text>
                  ) : null}
                  {profile?.profileCode ? (
                    <Pressable
                      style={styles.linkButton}
                      onPress={() => openProfile(profile)}
                    >
                      <Text style={styles.linkButtonText}>{copy.viewProfile}</Text>
                    </Pressable>
                  ) : null}
                  {isPaid ? (
                    <View style={styles.actions}>
                      <Pressable
                        style={styles.accept}
                        disabled={actingId === item.id}
                        onPress={() => void handleRespond(item.id, true)}
                      >
                        <Text style={styles.actionText}>{copy.accept}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.declineInline}
                        disabled={actingId === item.id}
                        onPress={() => void handleRespond(item.id, false)}
                      >
                        <Text style={styles.declineText}>{copy.decline}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.gateWrap}>
                      <PaidMembershipGate feature="interest" locale={locale} compact />
                    </View>
                  )}
                </View>
              );
            })
          )
        ) : null}

        {tab === "outgoing" ? (
          outgoing.length === 0 ? (
            <EmptyState message={copy.emptySent} icon="send-outline" />
          ) : (
            outgoing.map((item) => {
              const profile = item.receiver.profile;
              const name = interestDisplayName(profile, copy, true);
              const subtitle = formatInterestProfileMeta(profile, dropdowns);
              return (
                <View key={item.id} style={styles.card}>
                  <Pressable
                    disabled={!profile?.profileCode}
                    onPress={() => openProfile(profile)}
                  >
                    <Text style={styles.name}>{name}</Text>
                    {subtitle ? <Text style={styles.meta}>{subtitle}</Text> : null}
                    <Text style={styles.hint}>{copy.outgoingHint}</Text>
                    <Text style={styles.sentOn}>
                      {copy.sentOn.replace("{date}", formatInterestDate(item.createdAt, locale))}
                    </Text>
                  </Pressable>
                  {profile?.profileCode ? (
                    <Pressable
                      style={styles.linkButton}
                      onPress={() => openProfile(profile)}
                    >
                      <Text style={styles.linkButtonText}>{copy.viewProfile}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.decline}
                    disabled={actingId === item.id}
                    onPress={() => void handleWithdraw(item.id)}
                  >
                    <Text style={styles.declineText}>{copy.withdraw}</Text>
                  </Pressable>
                </View>
              );
            })
          )
        ) : null}

        {tab === "connected" ? (
          connections.length === 0 ? (
            <EmptyState message={copy.emptyConnected} icon="account-multiple-outline" />
          ) : (
            connections.map((item) => {
              const name = resolveMemberDisplayName({
                fullName: item.member.fullName,
                profileCode: item.member.profileCode,
              });
              const privacyLabel =
                privacyLabels[String(item.privacyLevel) as keyof typeof privacyLabels] ??
                String(item.privacyLevel);
              const profileRef = connectionProfileRef(item.member);
              const nextLevel = item.privacyLevel + 1;
              const meta = [
                item.member.profileCode
                  ? copy.profileId.replace("{code}", item.member.profileCode)
                  : null,
                copy.privacyLevelWithLabel
                  .replace("{level}", String(item.privacyLevel))
                  .replace("{label}", privacyLabel),
              ]
                .filter(Boolean)
                .join(" · ");
              const canViewProfile =
                Boolean(item.member.profileId) && Boolean(item.member.profileCode);

              return (
                <View key={item.connectionId} style={styles.card}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.meta}>{meta}</Text>
                  <View style={styles.connectedActions}>
                    {canViewProfile ? (
                      <Pressable
                        style={styles.outlineButton}
                        onPress={() => openConnectedProfile(item)}
                      >
                        <Text style={styles.outlineButtonText}>{copy.viewProfile}</Text>
                      </Pressable>
                    ) : null}
                    {isPaid ? (
                      <Pressable
                        style={styles.primaryButton}
                        onPress={() => openChat(item, name)}
                      >
                        <Text style={styles.primaryButtonText}>{copy.openChat}</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.gateWrap}>
                        <PaidMembershipGate feature="messages" locale={locale} compact />
                      </View>
                    )}
                  </View>
                  {isPaid && item.privacyLevel >= MIN_CONSULTANT_PRIVACY_LEVEL ? (
                    <ConnectionConsultantPanel
                      connectionId={item.connectionId}
                      locale={locale}
                    />
                  ) : null}
                  <View style={styles.upgradeSection}>
                    {item.privacyLevel < 3 && !item.pendingUpgradeLevel ? (
                      <Pressable
                        style={styles.upgradeRequestButton}
                        disabled={privacyActingRef === profileRef || !profileRef}
                        onPress={() => profileRef && void handleUpgrade(profileRef)}
                      >
                        <Text style={styles.upgradeRequestText}>
                          {copy.requestUpgrade.replace("{level}", String(nextLevel))}
                        </Text>
                      </Pressable>
                    ) : null}
                    {item.pendingUpgradeByMe && item.pendingUpgradeLevel ? (
                      <Text style={styles.upgradePendingBadge}>
                        {copy.upgradePending.replace(
                          "{level}",
                          String(item.pendingUpgradeLevel),
                        )}
                      </Text>
                    ) : null}
                    {item.pendingUpgradeLevel && !item.pendingUpgradeByMe && profileRef ? (
                      <View style={styles.upgradeIncomingWrap}>
                        <Text style={styles.upgradeIncomingBadge}>
                          {copy.upgradeIncoming.replace(
                            "{level}",
                            String(item.pendingUpgradeLevel),
                          )}
                        </Text>
                        <View style={styles.upgradeRespondActions}>
                          <Pressable
                            style={styles.accept}
                            disabled={privacyActingRef === profileRef}
                            onPress={() => void handlePrivacyRespond(profileRef, true)}
                          >
                            <Text style={styles.actionText}>{copy.acceptUpgrade}</Text>
                          </Pressable>
                          <Pressable
                            style={styles.declineInline}
                            disabled={privacyActingRef === profileRef}
                            onPress={() => void handlePrivacyRespond(profileRef, false)}
                          >
                            <Text style={styles.declineText}>{copy.declineUpgrade}</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose50 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.rose100,
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: colors.rose50,
  },
  tabActive: { backgroundColor: colors.rose800 },
  tabText: { fontSize: 11, fontWeight: "600", color: colors.zinc600 },
  tabTextActive: { color: colors.white },
  list: { padding: 16, flexGrow: 1 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.zinc900 },
  meta: { marginTop: 4, fontSize: 12, color: colors.zinc600 },
  sentOn: { marginTop: 4, fontSize: 12, color: colors.zinc500 },
  hint: { marginTop: 6, fontSize: 11, lineHeight: 16, color: colors.zinc500 },
  linkButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.rose800,
  },
  connectedActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    alignItems: "center",
  },
  outlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.zinc100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.zinc800,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  accept: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 10,
    alignItems: "center",
  },
  declineInline: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 10,
    alignItems: "center",
  },
  decline: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  actionText: { color: colors.white, fontWeight: "700" },
  declineText: { color: colors.rose800, fontWeight: "700" },
  error: {
    marginHorizontal: 16,
    marginTop: 8,
    color: colors.red600,
    fontSize: 13,
  },
  success: {
    marginHorizontal: 16,
    marginTop: 8,
    color: colors.emerald600,
    fontSize: 13,
  },
  gateWrap: {
    marginTop: 12,
  },
  upgradeSection: {
    marginTop: 12,
    gap: 8,
  },
  upgradeRequestButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  upgradeRequestText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  upgradePendingBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#92400E",
  },
  upgradeIncomingWrap: {
    gap: 8,
  },
  upgradeIncomingBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#1E40AF",
  },
  upgradeRespondActions: {
    flexDirection: "row",
    gap: 8,
  },
});
