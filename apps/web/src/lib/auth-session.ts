import {
  AUTH_TOKEN_KEY,
  invalidateDedupeCache,
  revokeDeviceSession,
} from "@/lib/api";

export const AUTH_CHANGED_EVENT = "easymatch-auth-changed";
export const DEVICE_TOKEN_KEY = "easymatch_device_token";
export const DEVICE_PHONE_KEY = "easymatch_device_phone";
export const DEVICE_PURPOSE_KEY = "easymatch_device_purpose";

export function notifyAuthChanged(): void {
  invalidateDedupeCache("auth:session:");
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  notifyAuthChanged();
}

export function setDeviceSession(
  deviceToken: string,
  phone: string,
  purpose: "member" | "staff",
): void {
  localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
  localStorage.setItem(DEVICE_PHONE_KEY, phone);
  localStorage.setItem(DEVICE_PURPOSE_KEY, purpose);
}

export function getDeviceSession(): {
  deviceToken: string;
  phone: string;
  purpose: "member" | "staff";
} | null {
  const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
  const phone = localStorage.getItem(DEVICE_PHONE_KEY);
  const purpose = localStorage.getItem(DEVICE_PURPOSE_KEY);
  if (!deviceToken || !phone) return null;
  return {
    deviceToken,
    phone,
    purpose: purpose === "staff" ? "staff" : "member",
  };
}

export function clearDeviceSession(): void {
  localStorage.removeItem(DEVICE_TOKEN_KEY);
  localStorage.removeItem(DEVICE_PHONE_KEY);
  localStorage.removeItem(DEVICE_PURPOSE_KEY);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  notifyAuthChanged();
}

export function clearAuthSession(): void {
  clearAuthToken();
  clearDeviceSession();
}

export function signOut(): void {
  const device = getDeviceSession();
  if (device) {
    void revokeDeviceSession(device.deviceToken).catch(() => undefined);
  }
  clearAuthSession();
}

const SESSION_NOTICE_KEY = "easymatch_session_notice";

export function rememberSessionNotice(message: string) {
  sessionStorage.setItem(SESSION_NOTICE_KEY, message);
}

export function consumeSessionNotice(): string | null {
  const value = sessionStorage.getItem(SESSION_NOTICE_KEY);
  if (value) sessionStorage.removeItem(SESSION_NOTICE_KEY);
  return value;
}
