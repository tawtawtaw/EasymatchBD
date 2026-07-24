import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MIN_VIDEO_CALL_PRIVACY_LEVEL } from "@easymatch/shared";
import { EmptyState, ErrorState, LoadingState } from "../../components/ScreenState";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { tVideoCalls } from "../../i18n/video-calls";
import { getApiErrorMessage } from "../../lib/api-error";
import { formatVideoCallWhen } from "../../lib/video-call-url";
import { resolveMemberDisplayName } from "../../lib/member-display";
import type { VideoCallsScreenProps } from "../../navigation/types";
import { listMyConnections } from "../../services/discovery";
import {
  createVideoCall,
  startScheduledVideoCall,
} from "../../services/video-calls";
import { useLocaleStore } from "../../store/localeStore";
import { useMemberAlertsStore } from "../../store/memberAlertsStore";
import type { ConnectionItem } from "../../types/discovery";
import type { VideoCallAlertItem } from "../../types/video-calls";
import { colors } from "../../theme/colors";

export default function VideoCallsScreen({ navigation }: VideoCallsScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const isPaid = useIsPaidMember();
  const alerts = useMemberAlertsStore((s) => s.callAlerts);
  const copy = tVideoCalls(locale);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [joiningAlertId, setJoiningAlertId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isPaid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const connectionList = await listMyConnections();
      setConnections(connectionList);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.actionsError, isPaid]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void useMemberAlertsStore.getState().refresh();
    }, [load]),
  );

  async function handleCallNow(connection: ConnectionItem) {
    setCallingId(connection.connectionId);
    setError(null);
    try {
      const call = await createVideoCall(connection.connectionId);
      navigation.navigate("VideoCallRoom", {
        connectionId: connection.connectionId,
        callId: call.id,
        memberName: resolveMemberDisplayName(connection.member, undefined, {
          member: copy.unknownMember,
          profileRef: (code) => copy.profileRef.replace("{code}", code),
        }),
      });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setCallingId(null);
    }
  }

  async function handleAlertAction(alert: VideoCallAlertItem) {
    setJoiningAlertId(alert.call.id);
    setError(null);
    try {
      if (alert.kind === "scheduled_starting") {
        await startScheduledVideoCall(alert.call.id);
      }
      navigation.navigate("VideoCallRoom", {
        connectionId: alert.call.connectionId,
        callId: alert.call.id,
        memberName:
          alert.partnerName?.trim() ||
          resolveMemberDisplayName(
            { fullName: alert.partnerName, profileCode: null },
            undefined,
            { member: copy.unknownMember },
          ),
      });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setJoiningAlertId(null);
    }
  }

  function alertMessage(alert: VideoCallAlertItem): string {
    const partner = alert.partnerName?.trim() || copy.unknownMember;
    const when = alert.call.scheduledAt
      ? formatVideoCallWhen(alert.call.scheduledAt, locale)
      : "";
    switch (alert.kind) {
      case "incoming":
        return copy.alertsIncoming.replace("{partner}", partner);
      case "scheduled_partner":
        return copy.alertsPartnerScheduled
          .replace("{partner}", partner)
          .replace("{when}", when);
      case "scheduled_reminder":
        return copy.alertsReminder
          .replace("{partner}", partner)
          .replace("{when}", when);
      case "scheduled_starting":
        return copy.alertsStarting
          .replace("{partner}", partner)
          .replace("{when}", when);
      default:
        return partner;
    }
  }

  if (!isPaid) {
    return (
      <View style={styles.gateContainer}>
        <PaidMembershipGate feature="videoCalls" locale={locale} />
      </View>
    );
  }

  if (loading && !refreshing) {
    return <LoadingState label={copy.hubLoading} />;
  }

  const eligible = connections.filter(
    (c) => c.privacyLevel >= MIN_VIDEO_CALL_PRIVACY_LEVEL,
  );
  const needsUpgrade = connections.filter(
    (c) => c.privacyLevel < MIN_VIDEO_CALL_PRIVACY_LEVEL,
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
      }
    >
      <Text style={styles.subtitle}>{copy.hubSubtitle}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {alerts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.hubActiveSection}</Text>
          {alerts.map((alert) => (
            <View key={`${alert.kind}-${alert.call.id}`} style={styles.alertCard}>
              <Text style={styles.alertText}>{alertMessage(alert)}</Text>
              <Pressable
                style={[
                  styles.primaryButton,
                  joiningAlertId === alert.call.id && styles.disabled,
                ]}
                onPress={() => void handleAlertAction(alert)}
                disabled={joiningAlertId === alert.call.id}
              >
                <Text style={styles.primaryButtonText}>
                  {joiningAlertId === alert.call.id ? copy.joiningScheduled : copy.openCall}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.hubConnectionsSection}</Text>
        {eligible.length === 0 ? (
          <EmptyState message={copy.hubEmpty} />
        ) : (
          eligible.map((item) => {
            const name = resolveMemberDisplayName(item.member, undefined, {
              member: copy.unknownMember,
              profileRef: (code) => copy.profileRef.replace("{code}", code),
            });
            const district = item.member.currentDistrict?.trim();
            return (
              <View key={item.connectionId} style={styles.connectionCard}>
                <View style={styles.connectionBody}>
                  <Text style={styles.connectionName}>{name}</Text>
                  {district ? (
                    <Text style={styles.connectionMeta}>{district}</Text>
                  ) : null}
                </View>
                <View style={styles.connectionActions}>
                  <Pressable
                    style={[
                      styles.primaryButton,
                      callingId === item.connectionId && styles.disabled,
                    ]}
                    onPress={() => void handleCallNow(item)}
                    disabled={callingId === item.connectionId}
                  >
                    <Text style={styles.primaryButtonText}>
                      {callingId === item.connectionId ? copy.hubCalling : copy.callNow}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() =>
                      navigation.navigate("ChatThread", {
                        connectionId: item.connectionId,
                        memberName: name,
                        profileCode: item.member.profileCode,
                      })
                    }
                  >
                    <Text style={styles.secondaryButtonText}>{copy.hubScheduleAndChat}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      {needsUpgrade.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.hubUpgradeSection}</Text>
          <Text style={styles.upgradeHint}>{copy.hubUpgradeHint}</Text>
          {needsUpgrade.map((item) => {
            const name = resolveMemberDisplayName(item.member, undefined, {
              member: copy.unknownMember,
              profileRef: (code) => copy.profileRef.replace("{code}", code),
            });
            return (
              <View key={item.connectionId} style={styles.upgradeCard}>
                <Text style={styles.connectionName}>{name}</Text>
                <Text style={styles.upgradeLevel}>
                  {copy.privacyLevelLabel.replace("{level}", String(item.privacyLevel))}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    backgroundColor: colors.rose50,
    padding: 16,
    justifyContent: "center",
  },
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
    marginBottom: 12,
  },
  error: {
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    padding: 10,
    fontSize: 13,
    color: colors.red600,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.zinc500,
    marginBottom: 10,
  },
  alertCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  alertText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc800,
  },
  connectionCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  connectionBody: { gap: 2 },
  connectionName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  connectionMeta: {
    fontSize: 12,
    color: colors.zinc500,
  },
  connectionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: colors.rose800,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.rose100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc800,
  },
  disabled: { opacity: 0.6 },
  upgradeHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc600,
    marginBottom: 10,
  },
  upgradeCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  upgradeLevel: {
    fontSize: 12,
    color: "#92400e",
  },
});
