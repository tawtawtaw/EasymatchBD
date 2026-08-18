import * as Notifications from "expo-notifications";

const ID_PREFIX = "scheduled-call-";
const INCOMING_CALLS_CHANNEL_ID = "incoming_calls_v2";

type ScheduledCallAlarm = {
  callId: string;
  connectionId: string;
  scheduledAt: string;
  partnerName?: string | null;
};

function alarmId(callId: string) {
  return `${ID_PREFIX}${callId}`;
}

export async function cancelScheduledCallAlarm(callId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(alarmId(callId));
  } catch {
    /* already cancelled or never scheduled */
  }
}

export async function scheduleScheduledCallAlarm(input: ScheduledCallAlarm) {
  const when = new Date(input.scheduledAt);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now() + 1500) {
    await cancelScheduledCallAlarm(input.callId);
    return;
  }

  await cancelScheduledCallAlarm(input.callId);
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: alarmId(input.callId),
      content: {
        title: "Scheduled video call",
        body: "Your video call is starting — tap to join",
        sound: "incoming_call_ring.wav",
        channelId: INCOMING_CALLS_CHANNEL_ID,
        data: {
          type: "call",
          callId: input.callId,
          connectionId: input.connectionId,
          scheduled: true,
          ...(input.partnerName?.trim()
            ? { callerName: input.partnerName.trim() }
            : {}),
        },
      },
      trigger: {
        type: "date",
        date: when,
      },
    });
  } catch {
    /* notification permission or scheduler unavailable */
  }
}

export async function syncScheduledCallAlarms(
  calls: ScheduledCallAlarm[],
) {
  const upcoming = calls.filter((call) => {
    const at = new Date(call.scheduledAt).getTime();
    return !Number.isNaN(at) && at > Date.now();
  });
  const keep = new Set(upcoming.map((call) => alarmId(call.callId)));

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(
          (item) =>
            item.identifier.startsWith(ID_PREFIX) && !keep.has(item.identifier),
        )
        .map((item) =>
          Notifications.cancelScheduledNotificationAsync(item.identifier),
        ),
    );
  } catch {
    /* ignore */
  }

  await Promise.all(upcoming.map((call) => scheduleScheduledCallAlarm(call)));
}
