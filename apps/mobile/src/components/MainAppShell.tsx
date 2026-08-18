import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { WhatsAppSupportFab } from "./WhatsAppSupportFab";
import { IncomingCallBanner } from "./IncomingCallBanner";
import { ScheduledCallAlertsBanner } from "./ScheduledCallAlertsBanner";
import { useAuthStore } from "../store/authStore";
import { useMemberVerificationStore } from "../store/memberVerificationStore";
import { useMemberAlertsStore } from "../store/memberAlertsStore";
import { syncScheduledCallAlarms } from "../lib/scheduled-call-alarms";

export function MainAppShell({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const syncVerification = useMemberVerificationStore((s) => s.sync);
  const startPolling = useMemberAlertsStore((s) => s.startPolling);
  const stopPolling = useMemberAlertsStore((s) => s.stopPolling);
  const callAlerts = useMemberAlertsStore((s) => s.callAlerts);

  useEffect(() => {
    if (!userId) return;
    void syncVerification(true);
  }, [syncVerification, userId]);

  useEffect(() => {
    if (!userId) {
      stopPolling();
      return;
    }

    startPolling(userId);
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling, userId]);

  useEffect(() => {
    if (!userId) return;
    void syncScheduledCallAlarms(
      callAlerts
        .filter(
          (alert) =>
            alert.call.status === "scheduled" && Boolean(alert.call.scheduledAt),
        )
        .map((alert) => ({
          callId: alert.call.id,
          connectionId: alert.call.connectionId,
          scheduledAt: alert.call.scheduledAt as string,
          partnerName: alert.partnerName,
        })),
    );
  }, [callAlerts, userId]);

  return (
    <View style={styles.root}>
      <IncomingCallBanner />
      <ScheduledCallAlertsBanner />
      {children}
      <WhatsAppSupportFab />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
