import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { LOCALE_BN_DEFAULT_MIGRATION_KEY, LOCALE_KEY } from "../constants/storage-keys";
import {
  DEFAULT_APP_LOCALE,
  normalizeLocale,
  type AppLocale,
} from "../lib/locale";

type LocaleState = {
  locale: AppLocale;
  isReady: boolean;
  bootstrap: () => Promise<void>;
  setLocale: (locale: AppLocale) => Promise<void>;
  resetToDefaultLocale: () => Promise<void>;
};

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: DEFAULT_APP_LOCALE,
  isReady: false,

  bootstrap: async () => {
    try {
      const migrated = await AsyncStorage.getItem(LOCALE_BN_DEFAULT_MIGRATION_KEY);
      if (!migrated) {
        await AsyncStorage.multiSet([
          [LOCALE_KEY, DEFAULT_APP_LOCALE],
          [LOCALE_BN_DEFAULT_MIGRATION_KEY, "1"],
        ]);
        set({ locale: DEFAULT_APP_LOCALE, isReady: true });
        return;
      }

      const stored = await AsyncStorage.getItem(LOCALE_KEY);
      set({
        locale: stored ? normalizeLocale(stored) : DEFAULT_APP_LOCALE,
        isReady: true,
      });
    } catch {
      set({ locale: DEFAULT_APP_LOCALE, isReady: true });
    }
  },

  setLocale: async (locale) => {
    set({ locale });
    try {
      await AsyncStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // ignore persistence errors
    }
  },

  resetToDefaultLocale: async () => {
    set({ locale: DEFAULT_APP_LOCALE });
    try {
      await AsyncStorage.setItem(LOCALE_KEY, DEFAULT_APP_LOCALE);
    } catch {
      // ignore persistence errors
    }
  },
}));
