import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const INCOMING_CALL_CHANNEL = "incoming_calls";
const RING_INTERVAL_MS = 2400;

let ringTimer: ReturnType<typeof setInterval> | null = null;
let activeCallId: string | null = null;

async function playRingPulse() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Incoming video call",
      body: "Tap to answer",
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === "android"
        ? { channelId: INCOMING_CALL_CHANNEL }
        : {}),
    },
    trigger: null,
  });
}

export async function startIncomingCallRing(callId: string) {
  if (activeCallId === callId && ringTimer) {
    return;
  }
  await stopIncomingCallRing();
  activeCallId = callId;
  await playRingPulse();
  ringTimer = setInterval(() => {
    void playRingPulse();
  }, RING_INTERVAL_MS);
}

export async function stopIncomingCallRing() {
  activeCallId = null;
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    /* ignore */
  }
}
