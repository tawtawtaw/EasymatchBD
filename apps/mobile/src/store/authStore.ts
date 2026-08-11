import { create } from "zustand";
import { clearMemberVerificationMediaCache } from "../store/memberVerificationStore";
import { clearConnectionPrivacyCache } from "../lib/connection-privacy";
import { invalidateConnectionsCache } from "../lib/member-status-refresh";
import { preservePushTokenBeforeSignOut, enablePushNotificationsOnLogin } from "../services/push-notifications";
import type { AuthSession, AuthUser } from "../services/auth";
import * as AuthService from "../services/auth";
import { sessionStorage } from "../services/session-storage";
import { withTimeout } from "../lib/with-timeout";
import { useAppLockStore } from "./appLockStore";
import { useMemberProfileStore } from "./memberProfileStore";
import { useLocaleStore } from "./localeStore";

type AuthState = {
  user: AuthUser | null;
  session: AuthSession | null;
  isBootstrapping: boolean;
  bootstrap: () => Promise<void>;
  skipBootstrap: () => Promise<void>;
  setFromAuthResponse: (user: AuthUser) => Promise<void>;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const BOOTSTRAP_TOTAL_MS = 10_000;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isBootstrapping: false,

  bootstrap: async () => {
    const token = await sessionStorage.getAccessToken();
    const device = await sessionStorage.getDeviceSession();

    if (!token && !device) {
      set({ isBootstrapping: false, user: null, session: null });
      return;
    }

    set({ isBootstrapping: true });
    try {
      const result = await withTimeout(
        AuthService.bootstrapAuth(),
        BOOTSTRAP_TOTAL_MS,
        "Sign-in check timed out",
      );
      if (result.status === "authenticated") {
        invalidateConnectionsCache();
        set({ user: result.user, session: result.session });
        void enablePushNotificationsOnLogin();
      } else {
        set({ user: null, session: null });
      }
    } catch {
      // A slow network or an API hiccup must not revoke the trusted device;
      // bootstrapAuth already drops credentials the server actually rejected.
      set({ user: null, session: null });
    } finally {
      set({ isBootstrapping: false });
    }
  },

  // "Skip" only abandons a stalled launch check, so the trusted device is kept
  // and the next launch can restore the session without another OTP.
  skipBootstrap: async () => {
    await useLocaleStore.getState().resetToDefaultLocale();
    set({ user: null, session: null, isBootstrapping: false });
  },

  setFromAuthResponse: async (user) => {
    invalidateConnectionsCache();
    set({ user });
    await get().refreshSession();
    await enablePushNotificationsOnLogin();
  },

  refreshSession: async () => {
    clearMemberVerificationMediaCache();
    const [user, session] = await AuthService.refreshAuthSession();
    set({ user, session });
  },

  signOut: async () => {
    await preservePushTokenBeforeSignOut();
    await AuthService.signOut();
    clearConnectionPrivacyCache();
    useMemberProfileStore.getState().clear();
    // The lock guards this member's session, so it must not outlive it and
    // greet whoever signs in on this device next.
    await useAppLockStore.getState().disableLock();
    await useLocaleStore.getState().resetToDefaultLocale();
    set({ user: null, session: null });
  },
}));
