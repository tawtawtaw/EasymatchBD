import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { AppLocale } from "./locale";

export type BiodataFlowScreen =
  | "EditPersonal"
  | "EditFamily"
  | "EditMarital"
  | "EditPartner"
  | "ProfileMedia"
  | "ProfileSetup";

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

export async function advanceAfterBiodataSave(options: {
  navigation: NavigationProp<ParamListBase>;
  currentScreen: BiodataFlowScreen;
  locale: AppLocale;
  isOnboardingSetup: boolean;
  refreshOnboarding: (locale?: AppLocale) => Promise<void>;
}) {
  if (!options.isOnboardingSetup) return;

  await options.refreshOnboarding(options.locale);

  const next = getNextBiodataScreen(options.currentScreen);
  if (next) {
    options.navigation.replace(next);
  }
}
