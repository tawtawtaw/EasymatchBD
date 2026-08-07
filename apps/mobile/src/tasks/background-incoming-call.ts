import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import {
  parseAndroidCallPushData,
  presentAndroidIncomingCallTelecom,
  setupAndroidIncomingCallTelecom,
} from "../services/android-incoming-call-telecom";

export const BACKGROUND_INCOMING_CALL_TASK = "easymatch-background-incoming-call";

TaskManager.defineTask(BACKGROUND_INCOMING_CALL_TASK, ({ data, error }) => {
  if (error || Platform.OS !== "android" || !data) {
    return;
  }

  const taskData = data as Notifications.Notification | { data?: Record<string, unknown> };
  let raw: Record<string, unknown> | undefined;
  if ("request" in taskData && taskData.request?.content?.data) {
    raw = taskData.request.content.data as Record<string, unknown>;
  } else if ("data" in taskData && taskData.data && typeof taskData.data === "object") {
    raw = taskData.data as Record<string, unknown>;
  }
  if (!raw || raw.type !== "call") {
    return;
  }

  const call = parseAndroidCallPushData(raw);
  if (!call) {
    return;
  }

  void (async () => {
    await setupAndroidIncomingCallTelecom();
    await presentAndroidIncomingCallTelecom(call);
  })();
});

export async function registerBackgroundIncomingCallTask() {
  if (Platform.OS !== "android") {
    return;
  }
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_INCOMING_CALL_TASK,
    );
    if (!registered) {
      await Notifications.registerTaskAsync(BACKGROUND_INCOMING_CALL_TASK);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn("[telecom] background task registration failed:", error);
    }
  }
}
