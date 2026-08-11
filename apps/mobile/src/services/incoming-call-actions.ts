import { Vibration } from "react-native";
import {
  dismissCallNotifications,
  stopIncomingCallRing,
} from "../lib/incoming-call-ringtone";
import { useMemberAlertsStore } from "../store/memberAlertsStore";
import { declineVideoCall } from "./video-calls";

/**
 * Silences locally before telling the server, so the ringing stops on tap even
 * if the request is slow or fails; the caller then sees a missed call instead
 * of a declined one, which is the better of the two failure modes.
 */
export async function declineIncomingCall(callId: string): Promise<void> {
  Vibration.cancel();
  await stopIncomingCallRing();
  // stopIncomingCallRing only knows about a call the app itself was ringing for,
  // so clear the tray by id to catch a ring the notification channel started.
  await dismissCallNotifications(callId);
  useMemberAlertsStore.getState().markCallHandled(callId);

  try {
    await declineVideoCall(callId);
  } catch {
    // Nothing actionable for the person declining.
  }
}
