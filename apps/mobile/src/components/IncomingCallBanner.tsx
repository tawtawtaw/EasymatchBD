import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tVideoCalls } from "../i18n/video-calls";
import { getApiErrorMessage } from "../lib/api-error";
import {
  startIncomingCallRing,
  stopIncomingCallRing,
} from "../lib/incoming-call-ringtone";
import { useActiveRouteName } from "../navigation/active-route";
import { openIncomingVideoCall } from "../services/incoming-call-navigation";
import { isAndroidConnectionServiceEnabled } from "../services/android-incoming-call-telecom";
import { useMemberAlertsStore } from "../store/memberAlertsStore";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

export function IncomingCallBanner() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tVideoCalls(locale);
  const alert = useMemberAlertsStore((s) => s.incomingCallAlert);
  const dismissIncomingCall = useMemberAlertsStore((s) => s.dismissIncomingCall);
  const isCallSuppressed = useMemberAlertsStore((s) => s.isCallSuppressed);
  const routeName = useActiveRouteName();
  const insets = useSafeAreaInsets();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const lastRungCallId = useRef<string | null>(null);
  const suppressed =
    alert?.call.id != null ? isCallSuppressed(alert.call.id) : false;

  useEffect(() => {
    if (alert?.kind !== "incoming" || suppressed) {
      lastRungCallId.current = null;
      Vibration.cancel();
      void stopIncomingCallRing();
      return;
    }
    if (routeName === "VideoCallRoom") {
      Vibration.cancel();
      void stopIncomingCallRing();
      return;
    }
    if (alert.call.id === lastRungCallId.current) {
      return;
    }
    lastRungCallId.current = alert.call.id;
    // Repeat alongside the looping ringtone rather than buzzing once.
    Vibration.vibrate([0, 700, 200, 700, 200, 700, 200, 900], true);
    void startIncomingCallRing(alert.call.id);
    return () => {
      Vibration.cancel();
      void stopIncomingCallRing();
    };
  }, [alert, routeName, suppressed]);

  if (!alert || alert.kind !== "incoming" || suppressed) {
    return null;
  }

  if (Platform.OS === "android" && isAndroidConnectionServiceEnabled()) {
    return null;
  }

  if (routeName === "VideoCallRoom") {
    return null;
  }

  const partner = alert.partnerName?.trim() || copy.unknownMember;
  const message = copy.alertsIncoming.replace("{partner}", partner);

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 10 }]}>
      <View style={styles.copy}>
        <Text style={styles.title}>{copy.hubTitle}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {message}
        </Text>
        {joinError ? (
          <Text style={styles.error} numberOfLines={2}>
            {joinError}
          </Text>
        ) : null}
      </View>
      <Pressable
        style={[styles.button, joining && styles.buttonDisabled]}
        disabled={joining}
        onPress={() => {
          if (!alert) return;
          setJoinError(null);
          setJoining(true);
          void openIncomingVideoCall({
            connectionId: alert.call.connectionId,
            callId: alert.call.id,
            memberName: partner,
            autoJoin: true,
          })
            .then((opened) => {
              if (opened) {
                Vibration.cancel();
                void stopIncomingCallRing();
                dismissIncomingCall();
                return;
              }
              setJoinError(copy.signInRequired);
            })
            .catch((err) => {
              setJoinError(getApiErrorMessage(err, copy.actionsError));
            })
            .finally(() => {
              setJoining(false);
            });
        }}
      >
        <Text style={styles.buttonText}>
          {joining ? copy.joiningCall : copy.answer}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.rose900,
    borderBottomWidth: 1,
    borderBottomColor: colors.rose800,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.rose100,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  body: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: "#fecaca",
    fontSize: 11,
    marginTop: 2,
  },
  button: {
    borderRadius: 999,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.rose900,
    fontSize: 13,
    fontWeight: "800",
  },
});
