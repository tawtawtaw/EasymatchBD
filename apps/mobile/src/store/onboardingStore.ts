import { create } from "zustand";
import {
  computeOnboardingPhase,
  mergeOnboardingBootstrap,
  type OnboardingBootstrap,
  type OnboardingPhase,
} from "../lib/member-onboarding";
import {
  getProfileEditorBootstrap,
  invalidateProfileEditorBootstrapCache,
} from "../services/profile";
import type { AppLocale } from "../lib/locale";

type OnboardingState = {
  phase: OnboardingPhase;
  bootstrap: OnboardingBootstrap | null;
  refresh: (locale?: AppLocale, options?: { force?: boolean }) => Promise<void>;
  reset: () => void;
};

let refreshInFlight: Promise<void> | null = null;
let refreshGeneration = 0;

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  phase: "loading",
  bootstrap: null,

  refresh: async (locale = "en", options?: { force?: boolean }) => {
    if (refreshInFlight && !options?.force) {
      return refreshInFlight;
    }

    const generation = ++refreshGeneration;

    refreshInFlight = (async () => {
      const previous = get().bootstrap;
      const isInitialLoad = previous === null;
      if (isInitialLoad) {
        set({ phase: "loading" });
      }

      try {
        invalidateProfileEditorBootstrapCache();
        const fetched = await getProfileEditorBootstrap(locale);
        if (generation !== refreshGeneration) {
          return;
        }
        const bootstrap = mergeOnboardingBootstrap(previous, fetched);
        set({
          bootstrap,
          phase: computeOnboardingPhase(bootstrap),
        });
      } catch {
        if (generation !== refreshGeneration) {
          return;
        }
        const previous = get().bootstrap;
        if (previous) {
          set({ phase: computeOnboardingPhase(previous) });
          return;
        }
        set({ bootstrap: null, phase: "terms" });
      }
    })().finally(() => {
      if (generation === refreshGeneration) {
        refreshInFlight = null;
      }
    });

    return refreshInFlight;
  },

  reset: () => {
    refreshInFlight = null;
    refreshGeneration += 1;
    set({ phase: "loading", bootstrap: null });
  },
}));
