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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MIN_VIDEO_CALL_PRIVACY_LEVEL } from "@easymatch/shared";
import { EmptyState, ErrorState, LoadingState } from "../../components/ScreenState";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { tVideoCalls } from "../../i18n/video-calls";
import { getApiErrorMessage } from "../../lib/api-error";
import { formatVideoCallWhen } from "../../lib/video-call-url";
import { cancelScheduledCallAlarm } from "../../lib/scheduled-call-alarms";
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
import { cardShadow } from "../../theme/shadows";

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
      await cancelScheduledCallAlarm(alert.call.id);
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
              <View style={styles.alertHeader}>
                <View style={styles.alertIcon}>
                  <MaterialCommunityIcons
                    name={
                      alert.kind === "incoming"
                        ? "phone-incoming"
                        : "calendar-clock"
                    }
                    size={18}
                    color={alert.kind === "incoming" ? "#047857" : "#0369a1"}
                  />
                </View>
                <Text style={styles.alertText}>{alertMessage(alert)}</Text>
              </View>
              <Pressable
                style={[
                  styles.alertAction,
                  joiningAlertId === alert.call.id && styles.disabled,
                ]}
                onPress={() => void handleAlertAction(alert)}
                disabled={joiningAlertId === alert.call.id}
              >
                <Text style={styles.alertActionText}>
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
          <EmptyState message={copy.hubEmpty} icon="video-outline" />
        ) : (
          eligible.map((item) => {
            const name = resolveMemberDisplayName(item.member, undefined, {
              member: copy.unknownMember,
              profileRef: (code) => copy.profileRef.replace("{code}", code),
            });
            const district = item.member.currentDistrict?.trim();
            return (
              <View key={item.connectionId} style={styles.connectionCard}>
                <View style={styles.connectionHeader}>
                  <View style={styles.connectionIcon}>
                    <MaterialCommunityIcons
                      name="video-outline"
                      size={22}
                      color={colors.rose800}
                    />
                  </View>
                  <View style={styles.connectionBody}>
                    <Text style={styles.connectionName}>{name}</Text>
                    {district ? (
                      <Text style={styles.connectionMeta}>{district}</Text>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  style={[
                    styles.callNowButton,
                    callingId === item.connectionId && styles.disabled,
                  ]}
                  onPress={() => void handleCallNow(item)}
                  disabled={callingId === item.connectionId}
                >
                  <MaterialCommunityIcons name="video" size={18} color={colors.white} />
                  <View style={styles.actionCopy}>
                    <Text style={styles.callNowTitle}>
                      {callingId === item.connectionId ? copy.hubCalling : copy.callNow}
                    </Text>
                    <Text style={styles.callNowHint}>{copy.hubCallNowHint}</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={styles.scheduleButton}
                  onPress={() =>
                    navigation.navigate("ChatThread", {
                      connectionId: item.connectionId,
                      memberName: name,
                      profileCode: item.member.profileCode,
                    })
                  }
                >
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={18}
                    color="#0369a1"
                  />
                  <View style={styles.actionCopy}>
                    <Text style={styles.scheduleTitle}>{copy.hubScheduleAndChat}</Text>
                    <Text style={styles.scheduleHint}>{copy.hubScheduleCardHint}</Text>
                  </View>
                </Pressable>
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
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#7dd3fc",
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...cardShadow,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#0c4a6e",
  },
  alertAction: {
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: colors.rose800,
    paddingVertical: 11,
  },
  alertActionText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  connectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    ...cardShadow,
  },
  connectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  connectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.rose50,
    borderWidth: 1,
    borderColor: colors.rose100,
  },
  connectionBody: { flex: 1, gap: 2 },
  connectionName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.zinc900,
  },
  connectionMeta: {
    fontSize: 12,
    color: colors.zinc500,
  },
  callNowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: colors.rose800,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  callNowTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
  callNowHint: {
    marginTop: 1,
    fontSize: 11,
    color: "#fecdd3",
  },
  scheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#7dd3fc",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0c4a6e",
  },
  scheduleHint: {
    marginTop: 1,
    fontSize: 11,
    color: "#0369a1",
  },
  actionCopy: { flex: 1 },
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
