import type { AppLocale } from "./locale";
import {
  getBlockedBiodataRedirect,
  sectionHasMissingRequired,
  type BiodataFlowScreen,
} from "./biodata-required";
import { syncMemberProfileStateAfterMutation } from "./member-status-refresh";
import { useOnboardingStore } from "../store/onboardingStore";

export type { BiodataFlowScreen };

type BiodataNavigation = {
  replace: (name: BiodataFlowScreen) => void;
};

const NEXT_BIODATA_SCREEN: Partial<Record<BiodataFlowScreen, BiodataFlowScreen>> = {
  EditPersonal: "EditFamily",
  EditFamily: "EditMarital",
  EditMarital: "EditPartner",
  EditPartner: "ProfileMedia",
};

export function getNextBiodataScreen(
  current: BiodataFlowScreen,
): BiodataFlowScreen | null {
  return NEXT_BIODATA_SCREEN[current] ?? null;
}

export function redirectIfBiodataStepLocked(
  navigation: BiodataNavigation,
  currentScreen: BiodataFlowScreen,
  isOnboardingSetup: boolean,
): boolean {
  if (!isOnboardingSetup) return false;
  const missing =
    useOnboardingStore.getState().bootstrap?.completionMissing ?? [];
  const redirect = getBlockedBiodataRedirect(currentScreen, missing);
  if (!redirect || redirect === currentScreen) return false;
  navigation.replace(redirect);
  return true;
}

export async function advanceAfterBiodataSave(options: {
  navigation: BiodataNavigation;
  currentScreen: BiodataFlowScreen;
  locale: AppLocale;
  isOnboardingSetup: boolean;
  refreshOnboarding: (locale?: AppLocale) => Promise<void>;
  completionMissing?: string[];
  completionPercent?: number;
}) {
  if (options.completionMissing) {
    const bootstrap = useOnboardingStore.getState().bootstrap;
    if (bootstrap) {
      useOnboardingStore.setState({
        bootstrap: {
          ...bootstrap,
          completionMissing: options.completionMissing,
          completionPercent:
            options.completionPercent ?? bootstrap.completionPercent,
        },
      });
    }
  }

  if (options.isOnboardingSetup) {
    const missing =
      options.completionMissing ??
      useOnboardingStore.getState().bootstrap?.completionMissing ??
      [];
    if (!sectionHasMissingRequired(options.currentScreen, missing)) {
      const next = getNextBiodataScreen(options.currentScreen);
      if (next) {
        options.navigation.replace(next);
      }
    }
  }

  await syncMemberProfileStateAfterMutation(options.locale);
}
