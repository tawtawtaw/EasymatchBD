import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tVideoCalls } from "../i18n/video-calls";
import { getApiErrorMessage } from "../lib/api-error";
import {
  startIncomingCallRing,
  stopIncomingCallRing,
} from "../lib/incoming-call-ringtone";
import { useActiveRouteName } from "../navigation/active-route";
import { declineIncomingCall } from "../services/incoming-call-actions";
import { openIncomingVideoCall } from "../services/incoming-call-navigation";
import { isAndroidConnectionServiceEnabled } from "../services/android-incoming-call-telecom";
import { useMemberAlertsStore } from "../store/memberAlertsStore";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

const RING_VIBRATION_PATTERN = [0, 700, 200, 700, 200, 700, 200, 900];

export function IncomingCallBanner() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tVideoCalls(locale);
  const alert = useMemberAlertsStore((s) => s.incomingCallAlert);
  const dismissIncomingCall = useMemberAlertsStore((s) => s.dismissIncomingCall);
  const isCallSuppressed = useMemberAlertsStore((s) => s.isCallSuppressed);
  const routeName = useActiveRouteName();
  const insets = useSafeAreaInsets();
  const [joining, setJoining] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const suppressed =
    alert?.call.id != null ? isCallSuppressed(alert.call.id) : false;

  // Depends on the call id rather than the alert object: polling replaces that
  // object every few seconds, and re-running the effect tore the ringtone down.
  const ringingCallId =
    alert?.kind === "incoming" && !suppressed && routeName !== "VideoCallRoom"
      ? alert.call.id
      : null;

  useEffect(() => {
    if (!ringingCallId) return;

    // Repeat alongside the looping ringtone rather than buzzing once.
    Vibration.vibrate(RING_VIBRATION_PATTERN, true);
    void startIncomingCallRing(ringingCallId);

    return () => {
      Vibration.cancel();
      void stopIncomingCallRing();
    };
  }, [ringingCallId]);

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
      <View style={styles.actions}>
        <Pressable
          style={[styles.declineButton, declining && styles.buttonDisabled]}
          disabled={joining || declining}
          onPress={() => {
            if (!alert) return;
            setDeclining(true);
            void declineIncomingCall(alert.call.id).finally(() => {
              setDeclining(false);
            });
          }}
        >
          <Text style={styles.declineButtonText}>
            {declining ? copy.decliningCall : copy.declineCall}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, joining && styles.buttonDisabled]}
          disabled={joining || declining}
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    borderRadius: 999,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  declineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose100,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  declineButtonText: {
    color: colors.rose100,
    fontSize: 13,
    fontWeight: "700",
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
