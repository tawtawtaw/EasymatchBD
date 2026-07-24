import Constants from "expo-constants";
import { Platform } from "react-native";

function getApiUrlFromBuild(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (__DEV__ && typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof fromExtra === "string" && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return "";
}

function defaultApiUrl(): string {
  if (__DEV__ && Platform.OS === "android") {
    return "http://10.0.2.2:4101/api/v1";
  }
  return "http://192.168.0.43:4101/api/v1";
}

function getWebBaseUrlFromBuild(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.webBaseUrl;
  if (typeof fromExtra === "string" && fromExtra.trim().length > 0) {
    return fromExtra.trim().replace(/\/$/, "");
  }
  return null;
}

function deriveWebOriginFromApiUrl(apiUrl: string): string {
  try {
    const parsed = new URL(apiUrl);
    if (parsed.port === "4101") {
      parsed.port = "4100";
    }
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.origin;
  } catch {
    return "http://localhost:4100";
  }
}

function getWebBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const fromExtra = getWebBaseUrlFromBuild();
  if (fromExtra) {
    return fromExtra;
  }

  const apiUrl = getApiUrlFromBuild() || defaultApiUrl();
  return deriveWebOriginFromApiUrl(apiUrl);
}

/** HTTPS/ngrok URL for in-app video call WebView (WebRTC needs a secure context). */
function getVideoCallWebBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_VIDEO_CALL_WEB_URL?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }

  const fromExtra = Constants.expoConfig?.extra?.videoCallWebBaseUrl;
  if (typeof fromExtra === "string" && fromExtra.trim().length > 0) {
    return fromExtra.trim().replace(/\/$/, "");
  }

  const webBase = getWebBaseUrl();
  if (webBase.startsWith("https://")) {
    return webBase;
  }

  return webBase;
}

export const config = {
  apiBaseUrl: getApiUrlFromBuild() || defaultApiUrl(),
  webBaseUrl: getWebBaseUrl(),
  videoCallWebBaseUrl: getVideoCallWebBaseUrl(),
  requestTimeoutMs: 30_000,
};
