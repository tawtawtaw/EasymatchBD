import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { navigationRef } from "../navigation/navigationRef";
import { navigateToProfileMedia } from "../navigation/navigateProfileMedia";
import { invalidateConnectionsCache } from "../lib/member-status-refresh";
import { refreshMemberStatusOnForeground } from "../lib/member-status-refresh";
import { useMemberAlertsStore } from "../store/memberAlertsStore";
import { useAuthStore } from "../store/authStore";
import { PUSH_AUTO_ENABLE_ATTEMPTED_KEY } from "../constants/storage-keys";
import { registerPushToken, registerPushTokenViaDevice, removePushToken, getPushTokenStatus } from "./alerts";
import { sessionStorage } from "./session-storage";
import { openIncomingVideoCall } from "./incoming-call-navigation";
import {
  parseAndroidCallPushData,
  presentAndroidIncomingCallTelecom,
} from "./android-incoming-call-telecom";

/** Android remote push was removed from Expo Go in SDK 53+. */
function isAndroidExpoGo(): boolean {
  return Platform.OS === "android" && Constants.appOwnership === "expo";
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown>;
    const type = typeof data?.type === "string" ? data.type : null;
    const callPayload =
      type === "call" && Platform.OS === "android"
        ? parseAndroidCallPushData(data)
        : null;
    let telecomIncomingUi = false;
    if (callPayload) {
      telecomIncomingUi = await presentAndroidIncomingCallTelecom(callPayload);
    }
    const priority =
      type === "call"
        ? Notifications.AndroidNotificationPriority.MAX
        : type === "message" ||
            type === "interest" ||
            type === "connection" ||
            type === "privacy_upgrade" ||
            type === "privacy_upgrade_accepted" ||
            type === "verification"
          ? Notifications.AndroidNotificationPriority.HIGH
          : Notifications.AndroidNotificationPriority.DEFAULT;
    return {
      shouldShowAlert: type === "call" && telecomIncomingUi ? false : true,
      shouldPlaySound: type === "call" && telecomIncomingUi ? false : true,
      shouldSetBadge: true,
      shouldShowBanner: type === "call" && telecomIncomingUi ? false : true,
      shouldShowList: type === "call" && telecomIncomingUi ? false : true,
      priority,
    };
  },
});

/** Matches app.json / app.config.js — used when Constants is unavailable in dev. */
const EAS_PROJECT_ID = "0980635d-027a-4d94-80ee-8320c084d15a";

let lastPushTokenError: string | null = null;

export function getLastPushTokenError() {
  return lastPushTokenError;
}

function resolveExpoProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    EAS_PROJECT_ID
  );
}

function formatPushTokenError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/firebase|FCM|FirebaseApp|google-services/i.test(message)) {
    return "Firebase (FCM) is not configured in this build. Add google-services.json, upload FCM credentials to Expo, then rebuild the app.";
  }
  return message;
}

let registeredToken: string | null = null;
let responseListener: Notifications.EventSubscription | null = null;
let receivedListener: Notifications.EventSubscription | null = null;
let pendingPushData: Record<string, unknown> | null = null;
let registrationInFlight: Promise<string | null> | null = null;

function pushPlatform() {
  return Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown";
}

async function rememberPushToken(token: string) {
  registeredToken = token;
  await sessionStorage.setPushToken(token);
}

async function readStoredPushToken() {
  return registeredToken ?? (await sessionStorage.getPushToken());
}

async function registerPushTokenWithSession(token: string) {
  const platform = pushPlatform();

  try {
    await registerPushToken(token, platform);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn("[push] JWT push registration failed:", error);
    }
  }

  const device = await sessionStorage.getDeviceSession();
  if (!device) {
    return false;
  }

  try {
    await registerPushTokenViaDevice(
      device.deviceToken,
      device.phone,
      token,
      platform,
    );
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn("[push] Device push registration failed:", error);
    }
    return false;
  }
}

function handleIncomingActivityPush() {
  invalidateConnectionsCache();
  if (useAuthStore.getState().user) {
    void useMemberAlertsStore.getState().refresh();
  }
}

function handleIncomingCallPush(data: Record<string, unknown>) {
  const connectionId =
    typeof data.connectionId === "string" ? data.connectionId : null;
  const callId = typeof data.callId === "string" ? data.callId : null;
  if (connectionId && callId) {
    useMemberAlertsStore.getState().primeIncomingCall(connectionId, callId);
    if (Platform.OS === "android") {
      const payload = parseAndroidCallPushData(data);
      if (payload) {
        void presentAndroidIncomingCallTelecom(payload);
      }
    }
    return;
  }
  if (useAuthStore.getState().user) {
    void useMemberAlertsStore.getState().refresh();
  }
}

function handleVerificationPush() {
  if (!useAuthStore.getState().user) {
    return;
  }
  void refreshMemberStatusOnForeground();
}

function handleMessagePush() {
  handleIncomingActivityPush();
}

function isIncomingActivityType(type: string | null) {
  return (
    type === "interest" ||
    type === "connection" ||
    type === "privacy_upgrade" ||
    type === "privacy_upgrade_accepted"
  );
}

function navigateFromPushData(data: Record<string, unknown> | undefined) {
  if (!data) {
    return;
  }

  const type = typeof data.type === "string" ? data.type : null;
  if (!type) return;

  if (
    type === "call" &&
    typeof data.connectionId === "string" &&
    typeof data.callId === "string"
  ) {
    handleIncomingCallPush(data);
    void openIncomingVideoCall({
      connectionId: data.connectionId,
      callId: data.callId,
      memberName: "Video call",
      autoJoin: true,
    }).then((opened) => {
      if (!opened && !useAuthStore.getState().user) {
        pendingPushData = data;
      }
    });
    return;
  }

  if (!useAuthStore.getState().user) {
    pendingPushData = data;
    return;
  }

  if (!navigationRef.isReady()) {
    pendingPushData = data;
    return;
  }

  if (type === "message" && typeof data.connectionId === "string") {
    handleIncomingActivityPush();
    navigationRef.navigate("Main", {
      screen: "Messages",
      params: {
        screen: "ChatThread",
        params: {
          connectionId: data.connectionId,
          memberName: "Message",
          profileCode: null,
        },
      },
    });
    return;
  }

  if (type === "interest") {
    handleIncomingActivityPush();
    navigationRef.navigate("Main", {
      screen: "Connections",
      params: { initialTab: "incoming" },
    });
    return;
  }

  if (type === "connection" || type === "privacy_upgrade_accepted") {
    handleIncomingActivityPush();
    navigationRef.navigate("Main", {
      screen: "Connections",
      params: { initialTab: "connected" },
    });
    return;
  }

  if (type === "privacy_upgrade") {
    handleIncomingActivityPush();
    navigationRef.navigate("Main", {
      screen: "Connections",
      params: { initialTab: "connected" },
    });
    return;
  }

  if (type === "verification") {
    handleVerificationPush();
    navigateToProfileMedia();
    return;
  }
}

async function ensureAndroidChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("incoming_calls", {
    name: "Incoming video calls",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    lightColor: "#881337",
    sound: "default",
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync("messages", {
    name: "Chat messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#881337",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync("incoming_activity", {
    name: "Interests & connections",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#881337",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync("verification", {
    name: "Verification updates",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#881337",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync("default", {
    name: "EasymatchBD",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#881337",
  });
}

function attachPushListeners() {
  if (!responseListener) {
    responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        navigateFromPushData(
          response.notification.request.content.data as Record<string, unknown>,
        );
      },
    );
  }

  if (!receivedListener) {
    receivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as Record<string, unknown>;
        if (data?.type === "verification") {
          handleVerificationPush();
        }
        if (isIncomingActivityType(typeof data?.type === "string" ? data.type : null)) {
          handleIncomingActivityPush();
        }
        if (data?.type === "call") {
          handleIncomingCallPush(data);
        }
        if (data?.type === "message") {
          handleMessagePush();
        }
      },
    );
  }
}

export function flushPendingPushNavigation() {
  if (!pendingPushData) {
    return;
  }
  const data = pendingPushData;
  pendingPushData = null;
  navigateFromPushData(data);
}

export function detachPushNotificationListeners() {
  if (responseListener) {
    responseListener.remove();
    responseListener = null;
  }
  if (receivedListener) {
    receivedListener.remove();
    receivedListener = null;
  }
}

async function readExpoPushToken(): Promise<string | null> {
  lastPushTokenError = null;

  if (!Device.isDevice || isAndroidExpoGo()) {
    lastPushTokenError = isAndroidExpoGo()
      ? "Android push requires a development build, not Expo Go."
      : "Push notifications require a physical device.";
    return null;
  }

  // Android 13+ needs a channel before the permission prompt / token request.
  await ensureAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    lastPushTokenError = "Notification permission denied.";
    return null;
  }

  const projectId = resolveExpoProjectId();
  if (!projectId) {
    lastPushTokenError = "EAS project ID is missing from the app config.";
    return null;
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResult.data ?? null;
    if (token) {
      await rememberPushToken(token);
      return token;
    }
    lastPushTokenError = "Expo returned an empty push token.";
    return null;
  } catch (error) {
    lastPushTokenError = formatPushTokenError(error);
    if (__DEV__) {
      console.warn("[push] Failed to get Expo push token:", lastPushTokenError);
    }
    return null;
  }
}

export async function preservePushTokenBeforeSignOut() {
  const token = (await readStoredPushToken()) ?? (await readExpoPushToken());
  if (!token) {
    if (__DEV__) {
      console.warn("[push] No Expo push token available before sign-out");
    }
    return;
  }

  await rememberPushToken(token);
  const ok = await registerPushTokenWithSession(token);
  if (__DEV__) {
    console.info(`[push] Preserved push token before sign-out: ${ok ? "ok" : "failed"}`);
  }
}

export type PushEnableResult = {
  granted: boolean;
  registered: boolean;
  token: string | null;
  error: string | null;
};

async function markPushAutoEnableAttempted() {
  await AsyncStorage.setItem(PUSH_AUTO_ENABLE_ATTEMPTED_KEY, "1");
}

export async function hasAttemptedPushAutoEnable() {
  return (await AsyncStorage.getItem(PUSH_AUTO_ENABLE_ATTEMPTED_KEY)) === "1";
}

/** Request OS permission, obtain Expo token, and register with the API. */
export async function enablePushNotificationsOnLogin(): Promise<PushEnableResult> {
  if (!Device.isDevice || isAndroidExpoGo()) {
    return {
      granted: false,
      registered: false,
      token: null,
      error: isAndroidExpoGo()
        ? "Android push requires a development build, not Expo Go."
        : "Push notifications require a physical device.",
    };
  }

  await markPushAutoEnableAttempted();

  const token = (await readExpoPushToken()) ?? (await readStoredPushToken());
  if (!token) {
    return {
      granted: false,
      registered: false,
      token: null,
      error: getLastPushTokenError() ?? "Notification permission denied.",
    };
  }

  if (registeredToken && registeredToken !== token) {
    await removePushToken(registeredToken).catch(() => undefined);
  }

  await rememberPushToken(token);
  const registered = await registerPushTokenWithSession(token);
  if (registered) {
    attachPushListeners();
  }

  if (__DEV__) {
    console.info(`[push] enablePushNotificationsOnLogin: registered=${registered}`);
  }

  return {
    granted: true,
    registered,
    token,
    error: registered ? null : "Could not link this device to your account yet.",
  };
}

export async function syncPushTokenRegistration() {
  if (!Device.isDevice || isAndroidExpoGo()) {
    return null;
  }

  if (registrationInFlight) {
    return registrationInFlight;
  }

  registrationInFlight = enablePushNotificationsOnLogin()
    .then((result) => (result.registered ? result.token : null))
    .finally(() => {
      registrationInFlight = null;
    });

  return registrationInFlight;
}

export async function setupPushNotifications() {
  return syncPushTokenRegistration();
}

/** Keep OS delivery + tap handling while logged out. */
export async function ensurePushNotificationsWhileLoggedOut() {
  if (!Device.isDevice || isAndroidExpoGo()) {
    return;
  }

  await readExpoPushToken();
  attachPushListeners();
  await handleColdStartNotification();
}

export async function teardownPushNotifications() {
  if (registeredToken) {
    await removePushToken(registeredToken).catch(() => undefined);
    registeredToken = null;
  }
  detachPushNotificationListeners();
}

export async function handleColdStartNotification() {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return;
  navigateFromPushData(
    response.notification.request.content.data as Record<string, unknown>,
  );
}

export type PushSetupStatus = {
  physicalDevice: boolean;
  permission: Notifications.PermissionStatus | null;
  expoToken: string | null;
  tokenError: string | null;
  apiRegistered: boolean;
};

export async function inspectPushNotificationSetup(): Promise<PushSetupStatus> {
  const physicalDevice = Device.isDevice && !isAndroidExpoGo();
  let permission: Notifications.PermissionStatus | null = null;
  let expoToken: string | null = null;
  let tokenError: string | null = null;
  let apiRegistered = false;

  if (!physicalDevice) {
    return {
      physicalDevice: false,
      permission: null,
      expoToken: null,
      tokenError: isAndroidExpoGo()
        ? "Android push requires a development build, not Expo Go."
        : "Push notifications require a physical device.",
      apiRegistered: false,
    };
  }

  try {
    const permissionResult = await Notifications.getPermissionsAsync();
    permission = permissionResult.status;
  } catch (error) {
    tokenError = error instanceof Error ? error.message : String(error);
  }

  try {
    expoToken = await readExpoPushToken();
    if (!expoToken) {
      tokenError =
        getLastPushTokenError() ??
        (permission === "denied"
          ? "Notification permission denied."
          : "Could not obtain an Expo push token.");
    }
  } catch (error) {
    tokenError = error instanceof Error ? error.message : String(error);
  }

  if (expoToken && useAuthStore.getState().user) {
    try {
      const status = await getPushTokenStatus();
      apiRegistered = status.registered;
      if (!apiRegistered) {
        const synced = await syncPushTokenRegistration();
        apiRegistered = Boolean(synced);
      }
    } catch {
      apiRegistered = false;
    }
  }

  return {
    physicalDevice,
    permission,
    expoToken,
    tokenError,
    apiRegistered,
  };
}
