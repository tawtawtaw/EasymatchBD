import { AppState, type AppStateStatus } from "react-native";
import { create } from "zustand";
import {
  clearPin,
  getBiometricCapability,
  isBiometricEnabled,
  isPinSet,
  setBiometricEnabled,
  setPin,
  type BiometricKind,
} from "../services/app-lock";

/**
 * Leaving the app briefly is normal (picking a photo, reading an SMS code), so
 * only a real absence re-locks it.
 */
const RELOCK_GRACE_MS = 60_000;

type AppLockState = {
  enabled: boolean;
  isLocked: boolean;
  isReady: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  biometricKind: BiometricKind;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  lockNow: () => void;
  unlock: () => void;
  enableLock: (pin: string) => Promise<void>;
  disableLock: () => Promise<void>;
  changeBiometric: (enabled: boolean) => Promise<void>;
  startWatching: () => void;
  stopWatching: () => void;
};

let appStateSub: { remove: () => void } | null = null;
let backgroundedAt: number | null = null;

export const useAppLockStore = create<AppLockState>((set, get) => ({
  enabled: false,
  isLocked: false,
  isReady: false,
  biometricEnabled: false,
  biometricAvailable: false,
  biometricKind: "none",

  bootstrap: async () => {
    const [enabled, capability, biometricPreference] = await Promise.all([
      isPinSet(),
      getBiometricCapability(),
      isBiometricEnabled(),
    ]);

    set({
      enabled,
      // A cold start is always an absence, so a configured lock starts closed.
      isLocked: enabled,
      isReady: true,
      biometricAvailable: capability.available,
      biometricKind: capability.kind,
      biometricEnabled: biometricPreference && capability.available,
    });
  },

  refresh: async () => {
    const [enabled, capability, biometricPreference] = await Promise.all([
      isPinSet(),
      getBiometricCapability(),
      isBiometricEnabled(),
    ]);

    set({
      enabled,
      isLocked: enabled ? get().isLocked : false,
      biometricAvailable: capability.available,
      biometricKind: capability.kind,
      biometricEnabled: biometricPreference && capability.available,
    });
  },

  lockNow: () => {
    if (!get().enabled) return;
    set({ isLocked: true });
  },

  unlock: () => {
    backgroundedAt = null;
    set({ isLocked: false });
  },

  enableLock: async (pin) => {
    await setPin(pin);
    set({ enabled: true, isLocked: false });
  },

  disableLock: async () => {
    await clearPin();
    set({ enabled: false, isLocked: false, biometricEnabled: false });
  },

  changeBiometric: async (enabled) => {
    await setBiometricEnabled(enabled);
    set({ biometricEnabled: enabled });
  },

  startWatching: () => {
    if (appStateSub) return;

    const onChange = (next: AppStateStatus) => {
      if (next === "background") {
        backgroundedAt = Date.now();
        return;
      }

      if (next !== "active") return;

      const awayMs = backgroundedAt === null ? 0 : Date.now() - backgroundedAt;
      backgroundedAt = null;
      if (get().enabled && awayMs > RELOCK_GRACE_MS) {
        set({ isLocked: true });
      }
    };

    appStateSub = AppState.addEventListener("change", onChange);
  },

  stopWatching: () => {
    appStateSub?.remove();
    appStateSub = null;
    backgroundedAt = null;
  },
}));
