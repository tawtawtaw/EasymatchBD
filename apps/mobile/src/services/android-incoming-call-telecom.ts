import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNCallKeep, { type EventsPayload } from "react-native-callkeep";
import { TELECOM_PENDING_CALLS_KEY } from "../constants/storage-keys";
import { declineVideoCall } from "./video-calls";
import { openIncomingVideoCall } from "./incoming-call-navigation";

export type AndroidIncomingCallPayload = {
  connectionId: string;
  callId: string;
  memberName?: string;
};

const activeTelecomCalls = new Map<string, AndroidIncomingCallPayload>();

let setupComplete = false;
let listenersRegistered = false;

function telecomUuid(callId: string) {
  return callId;
}

function rememberCall(payload: AndroidIncomingCallPayload) {
  const callUuid = telecomUuid(payload.callId);
  activeTelecomCalls.set(callUuid, payload);
  void persistTelecomCalls();
}

function forgetCall(callUuid: string) {
  activeTelecomCalls.delete(callUuid);
  void persistTelecomCalls();
}

async function persistTelecomCalls() {
  try {
    const record = Object.fromEntries(activeTelecomCalls.entries());
    await AsyncStorage.setItem(TELECOM_PENDING_CALLS_KEY, JSON.stringify(record));
  } catch {
    /* ignore storage errors */
  }
}

async function hydrateTelecomCallsFromStorage() {
  try {
    const raw = await AsyncStorage.getItem(TELECOM_PENDING_CALLS_KEY);
    if (!raw) return;
    const record = JSON.parse(raw) as Record<string, AndroidIncomingCallPayload>;
    for (const [uuid, payload] of Object.entries(record)) {
      if (payload?.connectionId && payload?.callId) {
        activeTelecomCalls.set(uuid, payload);
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
}

async function payloadForUuid(callUuid: string): Promise<AndroidIncomingCallPayload | null> {
  const cached = activeTelecomCalls.get(callUuid);
  if (cached) {
    return cached;
  }
  await hydrateTelecomCallsFromStorage();
  return activeTelecomCalls.get(callUuid) ?? null;
}

export function isAndroidConnectionServiceEnabled() {
  return Platform.OS === "android" && setupComplete;
}

async function handleAnswer(callUuid: string) {
  const payload = await payloadForUuid(callUuid);
  if (!payload) {
    return;
  }

  try {
    await RNCallKeep.backToForeground();
  } catch {
    /* optional on some devices */
  }

  void openIncomingVideoCall({
    connectionId: payload.connectionId,
    callId: payload.callId,
    memberName: payload.memberName ?? "Video call",
    autoJoin: true,
  });

  try {
    await RNCallKeep.setCurrentCallActive(callUuid);
  } catch {
    /* non-fatal */
  }
}

async function handleEnd(callUuid: string) {
  const payload = await payloadForUuid(callUuid);
  forgetCall(callUuid);
  if (!payload) {
    return;
  }
  void declineVideoCall(payload.callId).catch(() => {
    /* call may already be ended */
  });
}

function registerAndroidTelecomListeners() {
  if (listenersRegistered || Platform.OS !== "android") {
    return;
  }
  listenersRegistered = true;

  RNCallKeep.addEventListener("answerCall", ({ callUUID }: EventsPayload["answerCall"]) => {
    void handleAnswer(callUUID);
  });

  RNCallKeep.addEventListener("endCall", ({ callUUID }: EventsPayload["endCall"]) => {
    void handleEnd(callUUID);
  });
}

export async function setupAndroidIncomingCallTelecom(): Promise<boolean> {
  if (Platform.OS !== "android" || setupComplete) {
    return Platform.OS === "android" && setupComplete;
  }

  registerAndroidTelecomListeners();

  try {
    await hydrateTelecomCallsFromStorage();
    const supported = await RNCallKeep.supportConnectionService();
    if (!supported) {
      return false;
    }

    await RNCallKeep.setup({
      ios: { appName: "EasymatchBD" },
      android: {
        alertTitle: "Video calls",
        alertDescription:
          "Allow EasymatchBD to show incoming video calls on your lock screen.",
        cancelButton: "Not now",
        okButton: "Allow",
        additionalPermissions: [],
        selfManaged: false,
        foregroundService: {
          channelId: "com.easymatchbd.member.telecom",
          channelName: "Video calls",
          notificationTitle: "EasymatchBD video call",
        },
      },
    });

    RNCallKeep.registerAndroidEvents();

    const hasAccount = await RNCallKeep.hasPhoneAccount();
    if (!hasAccount) {
      return false;
    }

    await RNCallKeep.setAvailable(true);
    setupComplete = true;

    const initial = await RNCallKeep.getInitialEvents();
    if (initial?.length) {
      for (const raw of initial) {
        try {
          const parsed = JSON.parse(raw) as {
            name?: string;
            data?: { callUUID?: string };
          };
          const callUUID = parsed.data?.callUUID;
          if (!callUUID) continue;
          if (parsed.name === "RNCallKeepPerformAnswerCallAction") {
            void handleAnswer(callUUID);
          }
          if (parsed.name === "RNCallKeepPerformEndCallAction") {
            void handleEnd(callUUID);
          }
        } catch {
          /* ignore malformed bootstrap events */
        }
      }
      RNCallKeep.clearInitialEvents();
    }

    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn("[telecom] setup failed:", error);
    }
    return false;
  }
}

export async function presentAndroidIncomingCallTelecom(
  payload: AndroidIncomingCallPayload,
): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  if (!setupComplete) {
    const ready = await setupAndroidIncomingCallTelecom();
    if (!ready) {
      return false;
    }
  }

  const callUuid = telecomUuid(payload.callId);
  rememberCall(payload);

  const callerName = payload.memberName?.trim() || "EasymatchBD video call";

  try {
    await RNCallKeep.displayIncomingCall(
      callUuid,
      payload.connectionId,
      callerName,
      "generic",
      true,
    );
    return true;
  } catch (error) {
    forgetCall(callUuid);
    if (__DEV__) {
      console.warn("[telecom] displayIncomingCall failed:", error);
    }
    return false;
  }
}

export async function endAndroidTelecomCall(callId: string) {
  if (Platform.OS !== "android" || !setupComplete) {
    return;
  }
  const callUuid = telecomUuid(callId);
  forgetCall(callUuid);
  try {
    await RNCallKeep.endCall(callUuid);
  } catch {
    /* already ended */
  }
}

export function parseAndroidCallPushData(
  data: Record<string, unknown>,
): AndroidIncomingCallPayload | null {
  const connectionId =
    typeof data.connectionId === "string" ? data.connectionId : null;
  const callId = typeof data.callId === "string" ? data.callId : null;
  if (!connectionId || !callId) {
    return null;
  }
  const memberName =
    typeof data.callerName === "string"
      ? data.callerName
      : typeof data.memberName === "string"
        ? data.memberName
        : undefined;
  return { connectionId, callId, memberName };
}
