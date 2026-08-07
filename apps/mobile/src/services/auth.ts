import { isValidBangladeshPhone } from "../lib/phone";
import { apiRequest, BOOTSTRAP_API_TIMEOUT_MS } from "./api/client";
import { dedupeRequest, invalidateDedupeCache } from "./api/dedupe";
import { sessionStorage } from "./session-storage";

export type AuthUser = {
  id: string;
  phone: string | null;
  email: string | null;
  role: string;
  phoneVerifiedAt: string | null;
  subscription: { plan: string; isActive: boolean } | null;
  completionPercent?: number;
  completionMissing?: string[];
  isVerified?: boolean;
  profile?: { id: string; isVerified: boolean } | null;
};

export type AuthSession = {
  role: string;
  profileKind: "member" | "staff";
  subscription?: { plan: string; isActive: boolean; endsAt?: string | null } | null;
  isPaidMember?: boolean;
  hasProfile?: boolean;
  isVerified?: boolean;
  isPaused?: boolean;
  pausedAt?: string | null;
  completionPercent?: number;
};

type AuthResponse = {
  accessToken: string;
  tokenType: string;
  isNewUser: boolean;
  deviceToken: string | null;
  deviceExpiresInDays: number | null;
  redirectPath: string | null;
  user: AuthUser;
};

export async function sendOtp(phone: string) {
  return apiRequest<{
    message: string;
    phone: string;
    expiresInSeconds: number;
    devOtp?: string;
  }>("/auth/otp/send", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ phone, purpose: "member" }),
  });
}

export async function verifyOtp(
  phone: string,
  code: string,
  rememberDevice = true,
) {
  const result = await apiRequest<AuthResponse>("/auth/otp/verify", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      phone,
      code,
      purpose: "member",
      rememberDevice,
    }),
  });

  await sessionStorage.setAccessToken(result.accessToken);
  if (result.deviceToken && result.user.phone) {
    await sessionStorage.setDeviceSession(result.deviceToken, result.user.phone);
  }

  return result;
}

export async function restoreDeviceSession(phone: string, deviceToken: string) {
  const result = await apiRequest<AuthResponse>("/auth/device/restore", {
    method: "POST",
    auth: false,
    timeoutMs: BOOTSTRAP_API_TIMEOUT_MS,
    body: JSON.stringify({
      phone,
      deviceToken,
      purpose: "member",
    }),
  });

  await sessionStorage.setAccessToken(result.accessToken);
  if (result.deviceToken && result.user.phone) {
    await sessionStorage.setDeviceSession(result.deviceToken, result.user.phone);
  }

  return result;
}

export async function revokeDeviceSession(deviceToken: string) {
  return apiRequest<{ revoked: boolean }>("/auth/device/revoke", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ deviceToken }),
  });
}

export async function refreshAuthSession() {
  return Promise.all([getMe(true), getSession()]);
}

export async function getSession() {
  return dedupeRequest(
    "auth:session",
    () =>
      apiRequest<AuthSession>("/auth/me/session", {
        timeoutMs: BOOTSTRAP_API_TIMEOUT_MS,
      }),
    30_000,
  );
}

export async function getMe(full = false) {
  return dedupeRequest(
    `auth:me:${full ? "1" : "0"}`,
    () =>
      apiRequest<
        AuthUser & { completionPercent?: number; completionMissing?: string[]; isVerified?: boolean }
      >(`/auth/me${full ? "?full=1" : ""}`, {
        timeoutMs: BOOTSTRAP_API_TIMEOUT_MS,
      }),
    full ? 30_000 : 1_500,
  );
}

export function validatePhoneInput(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return "Enter your mobile number";
  }
  if (!isValidBangladeshPhone(trimmed)) {
    return "Enter a valid Bangladesh mobile number";
  }
  return null;
}

export async function signOut() {
  const device = await sessionStorage.getDeviceSession();
  if (device) {
    try {
      await revokeDeviceSession(device.deviceToken);
    } catch {
      // ignore revoke failures on logout
    }
  }
  invalidateDedupeCache();
  await sessionStorage.clearAll();
}

export async function bootstrapAuth(): Promise<
  | { status: "authenticated"; user: AuthUser; session: AuthSession }
  | { status: "unauthenticated" }
> {
  const token = await sessionStorage.getAccessToken();
  if (token) {
    try {
      const [session, user] = await Promise.all([getSession(), getMe(true)]);
      return { status: "authenticated", user, session };
    } catch {
      await sessionStorage.clearAccessToken();
    }
  }

  const device = await sessionStorage.getDeviceSession();
  if (device) {
    try {
      const restored = await restoreDeviceSession(device.phone, device.deviceToken);
      const session = await getSession();
      return { status: "authenticated", user: restored.user, session };
    } catch {
      await sessionStorage.clearDeviceSession();
    }
  }

  return { status: "unauthenticated" };
}

/** Restores JWT for calls without clearing storage on failure (WhatsApp-style answer from notification). */
export async function trySilentSessionRestore(): Promise<string | null> {
  const existing = await sessionStorage.getAccessToken();
  if (existing) {
    try {
      await getMe(false);
      return existing;
    } catch {
      /* JWT may be expired; try remembered device below */
    }
  }

  const device = await sessionStorage.getDeviceSession();
  if (!device) {
    return null;
  }

  try {
    const restored = await restoreDeviceSession(device.phone, device.deviceToken);
    return restored.accessToken;
  } catch {
    return null;
  }
}
