import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shouldRingScheduledVideoCall } from "@easymatch/shared";
import { tVideoCalls } from "../i18n/video-calls";
import { formatVideoCallWhen } from "../lib/video-call-url";
import { useActiveRouteName } from "../navigation/active-route";
import { navigationRef } from "../navigation/navigationRef";
import { startScheduledVideoCall } from "../services/video-calls";
import { openIncomingVideoCall } from "../services/incoming-call-navigation";
import { useLocaleStore } from "../store/localeStore";
import { useMemberAlertsStore } from "../store/memberAlertsStore";
import type { VideoCallAlertItem } from "../types/video-calls";
import { colors } from "../theme/colors";
import { cancelScheduledCallAlarm } from "../lib/scheduled-call-alarms";

const DISMISS_PREFIX = "easymatch_scheduled_call_alert_";

function dismissKey(alert: VideoCallAlertItem) {
  return `${DISMISS_PREFIX}${alert.kind}_${alert.call.id}_${alert.call.updatedAt}`;
}

export function ScheduledCallAlertsBanner() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tVideoCalls(locale);
  const routeName = useActiveRouteName();
  const callAlerts = useMemberAlertsStore((s) => s.callAlerts);
  const [dismissed, setDismissed] = useState<Record<string, true>>({});
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      callAlerts.filter((alert) => {
        if (
          alert.kind !== "scheduled_partner" &&
          alert.kind !== "scheduled_reminder" &&
          alert.kind !== "scheduled_starting"
        ) {
          return false;
        }
        if (
          alert.kind === "scheduled_starting" &&
          alert.call.scheduledAt &&
          shouldRingScheduledVideoCall(alert.call.scheduledAt)
        ) {
          return false;
        }
        return true;
      }),
    [callAlerts],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      candidates.map(async (alert) => {
        const value = await AsyncStorage.getItem(dismissKey(alert));
        return [dismissKey(alert), value === "1"] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, true> = {};
      for (const [key, isDismissed] of entries) {
        if (isDismissed) next[key] = true;
      }
      setDismissed(next);
    });
    return () => {
      cancelled = true;
    };
  }, [candidates]);

  const visible = useMemo(
    () => candidates.filter((alert) => !dismissed[dismissKey(alert)]),
    [candidates, dismissed],
  );

  const dismiss = useCallback(async (alert: VideoCallAlertItem) => {
    const key = dismissKey(alert);
    await AsyncStorage.setItem(key, "1");
    setDismissed((prev) => ({ ...prev, [key]: true }));
  }, []);

  const openCall = useCallback(
    async (alert: VideoCallAlertItem) => {
      const partner = alert.partnerName?.trim() || copy.unknownMember;
      if (alert.kind === "scheduled_starting") {
        setJoiningId(alert.call.id);
        try {
          await startScheduledVideoCall(alert.call.id);
          await cancelScheduledCallAlarm(alert.call.id);
          await openIncomingVideoCall({
            connectionId: alert.call.connectionId,
            callId: alert.call.id,
            memberName: partner,
            autoJoin: true,
          });
        } catch {
          await openIncomingVideoCall({
            connectionId: alert.call.connectionId,
            callId: alert.call.id,
            memberName: partner,
            autoJoin: false,
          });
        } finally {
          setJoiningId(null);
        }
        return;
      }

      if (!navigationRef.isReady()) return;
      navigationRef.navigate("Main", {
        screen: "Messages",
        params: {
          screen: "ChatThread",
          params: {
            connectionId: alert.call.connectionId,
            memberName: partner,
            profileCode: null,
          },
        },
      });
    },
    [copy.unknownMember],
  );

  if (
    routeName === "VideoCallRoom" ||
    routeName === "VideoCalls" ||
    visible.length === 0
  ) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {visible.map((alert) => {
        const partner = alert.partnerName?.trim() || copy.unknownMember;
        const when = alert.call.scheduledAt
          ? formatVideoCallWhen(alert.call.scheduledAt, locale)
          : "";
        const body =
          alert.kind === "scheduled_starting"
            ? copy.alertsStarting
                .replace("{partner}", partner)
                .replace("{when}", when)
            : alert.kind === "scheduled_reminder"
              ? copy.alertsReminder
                  .replace("{partner}", partner)
                  .replace("{when}", when)
              : copy.alertsPartnerScheduled
                  .replace("{partner}", partner)
                  .replace("{when}", when);
        const joining = joiningId === alert.call.id;

        return (
          <View key={`${alert.kind}-${alert.call.id}`} style={styles.card}>
            <Text style={styles.title}>{copy.hubTitle}</Text>
            <Text style={styles.body}>{body}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => void dismiss(alert)}
                style={styles.dismiss}
              >
                <Text style={styles.dismissText}>{copy.alertsDismiss}</Text>
              </Pressable>
              <Pressable
                onPress={() => void openCall(alert)}
                style={styles.action}
                disabled={joining}
              >
                <Text style={styles.actionText}>
                  {alert.kind === "scheduled_starting"
                    ? joining
                      ? copy.joiningScheduled
                      : copy.joinScheduled
                    : copy.openCall}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#7dd3fc",
    backgroundColor: "#f0f9ff",
    padding: 12,
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: "#075985",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  body: { fontSize: 13, lineHeight: 18, color: "#0c4a6e" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  dismiss: { paddingVertical: 6, paddingHorizontal: 8 },
  dismissText: { fontSize: 12, fontWeight: "600", color: colors.zinc600 },
  action: {
    borderRadius: 8,
    backgroundColor: "#0369a1",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionText: { fontSize: 12, fontWeight: "700", color: colors.white },
});
