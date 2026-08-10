import * as Notifications from "expo-notifications";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

const RINGTONE = require("../../assets/sounds/incoming-call.wav");

let player: AudioPlayer | null = null;
let activeCallId: string | null = null;

function ensurePlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(RINGTONE);
    player.loop = true;
  }
  return player;
}

export async function startIncomingCallRing(callId: string) {
  if (activeCallId === callId && player?.playing) {
    return;
  }

  activeCallId = callId;

  try {
    // Ring even when the handset switch is silenced, and duck other audio the
    // way a real incoming call would.
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
    });
  } catch {
    // A failed audio mode should not stop us from trying to ring.
  }

  try {
    const current = ensurePlayer();
    current.volume = 1;
    await current.seekTo(0);
    current.play();
  } catch {
    // Leave activeCallId set so stopIncomingCallRing still tidies up.
  }
}

export async function stopIncomingCallRing() {
  const callId = activeCallId;
  activeCallId = null;

  try {
    player?.pause();
    await player?.seekTo(0);
  } catch {
    // Ignore; the player is torn down on the next start if it is wedged.
  }

  if (callId) {
    await dismissCallNotifications(callId);
  }
}

/**
 * Clears only this call's tray entries. The previous implementation dismissed
 * every notification, wiping unread messages and interests along with it.
 */
async function dismissCallNotifications(callId: string) {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((item) => {
          const data = item.request.content.data as Record<string, unknown>;
          return data?.type === "call" && data?.callId === callId;
        })
        .map((item) =>
          Notifications.dismissNotificationAsync(item.request.identifier),
        ),
    );
  } catch {
    // Tray access can fail while the app is backgrounded; not worth surfacing.
  }
}
