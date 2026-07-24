import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { WhatsAppSupportFab } from "./WhatsAppSupportFab";
import { IncomingCallBanner } from "./IncomingCallBanner";
import { useAuthStore } from "../store/authStore";
import { useMemberVerificationStore } from "../store/memberVerificationStore";
import { useMemberAlertsStore } from "../store/memberAlertsStore";

export function MainAppShell({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const syncVerification = useMemberVerificationStore((s) => s.sync);
  const startPolling = useMemberAlertsStore((s) => s.startPolling);
  const stopPolling = useMemberAlertsStore((s) => s.stopPolling);

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

  return (
    <View style={styles.root}>
      <IncomingCallBanner />
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
