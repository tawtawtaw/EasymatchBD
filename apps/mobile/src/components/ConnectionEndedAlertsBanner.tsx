import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { tEndConnection } from "../i18n/messages";
import { navigateToDiscoveryProfile } from "../navigation/nestedNavigation";
import type { MainTabParamList } from "../navigation/types";
import { useLocaleStore } from "../store/localeStore";
import { useMemberAlertsStore } from "../store/memberAlertsStore";
import type { EndedConnectionAlert } from "../services/alerts";
import { colors } from "../theme/colors";

const DISMISS_PREFIX = "easymatch_connection_ended_alert_";

function dismissKey(alert: EndedConnectionAlert) {
  return `${DISMISS_PREFIX}${alert.connectionId}_${alert.endedAt}`;
}

function formatReconnectDate(iso: string, locale: "en" | "bn") {
  return new Date(iso).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ConnectionEndedAlertsBanner() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tEndConnection(locale);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const alerts = useMemberAlertsStore((s) => s.endedConnectionAlerts);
  const [dismissed, setDismissed] = useState<Record<string, true>>({});

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      alerts.map(async (alert) => {
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
  }, [alerts]);

  const visible = useMemo(
    () => alerts.filter((alert) => !dismissed[dismissKey(alert)]),
    [alerts, dismissed],
  );

  const dismiss = useCallback(async (alert: EndedConnectionAlert) => {
    const key = dismissKey(alert);
    await AsyncStorage.setItem(key, "1");
    setDismissed((prev) => ({ ...prev, [key]: true }));
  }, []);

  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {visible.map((alert) => {
        const name =
          alert.member.fullName?.trim() ||
          (alert.member.profileCode
            ? copy.profileRef.replace("{code}", alert.member.profileCode)
            : null);
        const date = alert.reconnectAvailableAt
          ? formatReconnectDate(alert.reconnectAvailableAt, locale)
          : null;
        const body = name
          ? date
            ? copy.endedAlertBodyNamed.replace("{name}", name).replace("{date}", date)
            : copy.endedAlertBodyNamedReady.replace("{name}", name)
          : date
            ? copy.endedAlertBody.replace("{date}", date)
            : copy.endedAlertBodyReady;

        return (
          <View key={`${alert.connectionId}-${alert.endedAt}`} style={styles.card}>
            <Text style={styles.title}>{copy.endedAlertTitle}</Text>
            <Text style={styles.body}>{body}</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => void dismiss(alert)} style={styles.dismiss}>
                <Text style={styles.dismissText}>{copy.endedAlertDismiss}</Text>
              </Pressable>
              {alert.member.profileCode ? (
                <Pressable
                  onPress={() =>
                    navigateToDiscoveryProfile(navigation, {
                      profileId: alert.member.profileCode!,
                      profileCode: alert.member.profileCode!,
                    })
                  }
                  style={styles.viewProfile}
                >
                  <Text style={styles.viewProfileText}>
                    {copy.endedAlertViewProfile}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    padding: 12,
    gap: 6,
  },
  title: { fontSize: 14, fontWeight: "700", color: "#78350f" },
  body: { fontSize: 13, lineHeight: 18, color: "#92400e" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  dismiss: { paddingVertical: 6, paddingHorizontal: 8 },
  dismissText: { fontSize: 12, fontWeight: "600", color: colors.zinc600 },
  viewProfile: {
    borderRadius: 8,
    backgroundColor: "#92400e",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  viewProfileText: { fontSize: 12, fontWeight: "700", color: colors.white },
});
