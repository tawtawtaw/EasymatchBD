import { useEffect } from "react";
import { Platform } from "react-native";
import { setupAndroidIncomingCallTelecom } from "../services/android-incoming-call-telecom";
import { registerBackgroundIncomingCallTask } from "../tasks/background-incoming-call";

/** Android ConnectionService (CallKeep) — lock-screen incoming call UI. */
export function AndroidCallKeepHost() {
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }
    void (async () => {
      await setupAndroidIncomingCallTelecom();
      await registerBackgroundIncomingCallTask();
    })();
  }, []);

  return null;
}
