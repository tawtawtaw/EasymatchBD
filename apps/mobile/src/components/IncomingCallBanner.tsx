import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tVideoCalls } from "../i18n/video-calls";
import { getApiErrorMessage } from "../lib/api-error";
import { useScheduledCallRingAlert } from "../hooks/use-scheduled-call-ring";
import {
  startIncomingCallRing,
  stopIncomingCallRing,
} from "../lib/incoming-call-ringtone";
import { useActiveRouteName } from "../navigation/active-route";
import { declineIncomingCall } from "../services/incoming-call-actions";
import { openIncomingVideoCall } from "../services/incoming-call-navigation";
import { isAndroidConnectionServiceEnabled } from "../services/android-incoming-call-telecom";
import { startScheduledVideoCall } from "../services/video-calls";
import { useMemberAlertsStore } from "../store/memberAlertsStore";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";
import { cancelScheduledCallAlarm } from "../lib/scheduled-call-alarms";

const RING_VIBRATION_PATTERN = [0, 700, 200, 700, 200, 700, 200, 900];

export function IncomingCallBanner() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tVideoCalls(locale);
  const incomingAlert = useMemberAlertsStore((s) => s.incomingCallAlert);
  const callAlerts = useMemberAlertsStore((s) => s.callAlerts);
  const dismissIncomingCall = useMemberAlertsStore((s) => s.dismissIncomingCall);
  const isCallSuppressed = useMemberAlertsStore((s) => s.isCallSuppressed);
  const routeName = useActiveRouteName();
  const insets = useSafeAreaInsets();
  const [joining, setJoining] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [silencedIds, setSilencedIds] = useState<Record<string, true>>({});

  const incomingSuppressed =
    incomingAlert?.call.id != null
      ? isCallSuppressed(incomingAlert.call.id)
      : false;
  const hideIncomingForTelecom =
    Platform.OS === "android" && isAndroidConnectionServiceEnabled();
  const incoming =
    incomingAlert?.kind === "incoming" &&
    !incomingSuppressed &&
    !hideIncomingForTelecom
      ? incomingAlert
      : null;

  const isRingSuppressed = useCallback(
    (callId: string) => isCallSuppressed(callId) || Boolean(silencedIds[callId]),
    [isCallSuppressed, silencedIds],
  );
  const scheduledRing = useScheduledCallRingAlert(callAlerts, isRingSuppressed);
  const scheduled = incoming || routeName === "VideoCallRoom" ? null : scheduledRing;
  const alert = incoming ?? scheduled;
  const isScheduledRing = Boolean(scheduled && !incoming);

  // Depends on the call id rather than the alert object: polling replaces that
  // object every few seconds, and re-running the effect tore the ringtone down.
  const ringingCallId =
    alert && routeName !== "VideoCallRoom" ? alert.call.id : null;

  useEffect(() => {
    if (!ringingCallId) return;

    // Repeat alongside the looping ringtone rather than buzzing once.
    Vibration.vibrate(RING_VIBRATION_PATTERN, true);
    void startIncomingCallRing(ringingCallId);

    // Backgrounded, the notification channel rings and startIncomingCallRing
    // deliberately does nothing, so take the ring over on the way back in.
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void startIncomingCallRing(ringingCallId);
      }
    });

    return () => {
      appState.remove();
      Vibration.cancel();
      void stopIncomingCallRing();
    };
  }, [ringingCallId]);

  if (!alert) {
    return null;
  }

  if (routeName === "VideoCallRoom") {
    return null;
  }

  const partner = alert.partnerName?.trim() || copy.unknownMember;
  const message = isScheduledRing
    ? copy.alertsScheduledRing.replace("{partner}", partner)
    : copy.alertsIncoming.replace("{partner}", partner);

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
            if (isScheduledRing) {
              setSilencedIds((prev) => ({ ...prev, [alert.call.id]: true }));
              Vibration.cancel();
              void stopIncomingCallRing();
              return;
            }
            setDeclining(true);
            void declineIncomingCall(alert.call.id).finally(() => {
              setDeclining(false);
            });
          }}
        >
          <Text style={styles.declineButtonText}>
            {isScheduledRing
              ? copy.silenceRing
              : declining
                ? copy.decliningCall
                : copy.declineCall}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, joining && styles.buttonDisabled]}
          disabled={joining || declining}
          onPress={() => {
            if (!alert) return;
            setJoinError(null);
            setJoining(true);
            void (async () => {
              try {
                if (isScheduledRing) {
                  await startScheduledVideoCall(alert.call.id);
                  await cancelScheduledCallAlarm(alert.call.id);
                }
                const opened = await openIncomingVideoCall({
                  connectionId: alert.call.connectionId,
                  callId: alert.call.id,
                  memberName: partner,
                  autoJoin: true,
                });
                if (opened) {
                  Vibration.cancel();
                  void stopIncomingCallRing();
                  if (isScheduledRing) {
                    setSilencedIds((prev) => ({
                      ...prev,
                      [alert.call.id]: true,
                    }));
                  } else {
                    dismissIncomingCall();
                  }
                  return;
                }
                setJoinError(copy.signInRequired);
              } catch (err) {
                setJoinError(getApiErrorMessage(err, copy.actionsError));
              } finally {
                setJoining(false);
              }
            })();
          }}
        >
          <Text style={styles.buttonText}>
            {joining
              ? isScheduledRing
                ? copy.joiningScheduled
                : copy.joiningCall
              : isScheduledRing
                ? copy.joinScheduled
                : copy.answer}
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
