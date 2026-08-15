export type BiodataFlowScreen =
  | "EditPersonal"
  | "EditFamily"
  | "EditMarital"
  | "EditPartner"
  | "ProfileMedia"
  | "ProfileSetup";

const PERSONAL_REQUIRED_KEYS = [
  "gender",
  "dateOfBirth",
  "maritalStatus",
  "religion",
  "currentDivision",
  "currentDistrict",
  "currentCityTown",
  "currentAddressLine",
  "permanentDistrict",
  "permanentCityTown",
  "permanentAddressLine",
  "introduction",
  "educationMedium",
  "highestDegree",
  "occupation",
  "prayerPractice",
  "smokingHabit",
] as const;

const FAMILY_REQUIRED_KEYS = ["fatherProfession", "motherProfession"] as const;
const PARTNER_REQUIRED_KEYS = ["ageMin"] as const;

const SECTION_REQUIRED_KEYS: Record<BiodataFlowScreen, readonly string[]> = {
  EditPersonal: PERSONAL_REQUIRED_KEYS,
  EditFamily: FAMILY_REQUIRED_KEYS,
  EditMarital: [],
  EditPartner: PARTNER_REQUIRED_KEYS,
  ProfileMedia: [
    "primaryPhoto",
    "nidFront",
    "nidBack",
    "creatorNidFront",
    "creatorNidBack",
  ],
  ProfileSetup: [],
};

export const BIODATA_SCREEN_ORDER: BiodataFlowScreen[] = [
  "EditPersonal",
  "EditFamily",
  "EditMarital",
  "EditPartner",
  "ProfileMedia",
];

export function isRequiredValueFilled(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 && trimmed !== "other";
}

export function sectionHasMissingRequired(
  screen: BiodataFlowScreen,
  completionMissing: string[],
): boolean {
  const keys = SECTION_REQUIRED_KEYS[screen] ?? [];
  return keys.some((key) => completionMissing.includes(key));
}

/** During onboarding, later steps stay locked until earlier required fields are filled. */
export function canOpenBiodataScreen(
  screen: BiodataFlowScreen,
  completionMissing: string[],
): boolean {
  const index = BIODATA_SCREEN_ORDER.indexOf(screen);
  if (index <= 0) return true;

  for (let i = 0; i < index; i += 1) {
    const previous = BIODATA_SCREEN_ORDER[i];
    if (sectionHasMissingRequired(previous, completionMissing)) {
      return false;
    }
  }
  return true;
}

/** First incomplete earlier step, if this screen should not be open yet. */
export function getBlockedBiodataRedirect(
  screen: BiodataFlowScreen,
  completionMissing: string[],
): BiodataFlowScreen | null {
  if (canOpenBiodataScreen(screen, completionMissing)) return null;

  for (const previous of BIODATA_SCREEN_ORDER) {
    if (previous === screen) break;
    if (sectionHasMissingRequired(previous, completionMissing)) {
      return previous;
    }
  }
  return "EditPersonal";
}
