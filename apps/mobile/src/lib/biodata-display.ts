import {
  formatHeightFromCm,
  getLivingArrangementsDropdownCategory,
  isoDateToDisplay,
  isAllBangladeshDistrictsPreferenceText,
  isAnyReligionPreferenceText,
  isOpenToAllDistricts,
  isOpenToAnyReligion,
  PROFILE_PRIVACY_FIELDS,
} from "@easymatch/shared";
import type { AppLocale } from "./locale";
import type { DropdownMap } from "../types/dropdowns";

/** Internal API keys that should not appear as separate rows. */
export const BIODATA_SKIP_KEYS = new Set(["heightUnit", "height_unit"]);

/** Maps export payload keys to admin.privacyFields.fields translation keys. */
export const BIODATA_PRIVACY_LABEL_ALIASES: Record<string, string> = {
  heightCm: "height",
  smokingHabit: "smoking_habit",
  hasBeard: "has_beard",
  childrenCount: "children_count",
  expectedMarriageTimeline: "expected_marriage_timeline",
  dowryExpectation: "dowry_expectation",
  weddingCeremonyPreference: "wedding_ceremony_preference",
  expectedParenthoodTimeline: "expected_parenthood_timeline",
  livingArrangements: "living_arrangements",
  livingArrangementsOther: "living_arrangements_other",
  expectedKabinAmountMinBdt: "expected_kabin_amount_min_bdt",
  expectedKabinAmountMaxBdt: "expected_kabin_amount_max_bdt",
  currentCountry: "current_country",
  permanentCountry: "permanent_country",
  preferredReligion: "partner_religion",
};

export const KNOWN_PRIVACY_FIELD_KEYS = new Set(
  Object.values(PROFILE_PRIVACY_FIELDS),
);

export const KNOWN_PARTNER_FIELD_KEYS = new Set([
  "ageMin",
  "ageMax",
  "heightMinCm",
  "heightMaxCm",
  "weightMinKg",
  "weightMaxKg",
  "preferredDistricts",
  "minimumEducation",
  "preferredProfession",
  "beardPreference",
  "prayerPreference",
  "hijabPreference",
  "maritalStatusPref",
  "additionalNotes",
]);

export const KNOWN_SIBLING_FIELD_KEYS = new Set([
  "relationship",
  "name",
  "education",
  "profession",
  "maritalStatus",
  "spouseName",
  "spouseEducation",
  "spouseProfession",
]);

export const KNOWN_RELATIVE_FIELD_KEYS = new Set([
  "relation",
  "name",
  "education",
  "profession",
]);

export function resolvePrivacyLabelKey(key: string) {
  return BIODATA_PRIVACY_LABEL_ALIASES[key] ?? key;
}

export function humanizeFieldKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

const MULTI_VALUE_COMMA_FIELDS = new Set([
  "maritalStatusPref",
  "preferredProfession",
]);

function formatUnresolvedFieldLabel(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("_")) {
    return humanizeFieldKey(trimmed);
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function resolveFieldItemLabel(
  key: string,
  raw: string,
  category: string | undefined,
  options: {
    dropdowns: DropdownMap;
    resolveStaticOption?: (key: string, value: string) => string | undefined;
  },
) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const fromDropdown = lookupDropdownLabel(options.dropdowns, category, trimmed);
  if (fromDropdown) return fromDropdown;

  const fromStatic =
    options.resolveStaticOption?.(key, trimmed) ??
    resolveStaticOptionLabel(key, trimmed);
  if (fromStatic) return fromStatic;

  return formatUnresolvedFieldLabel(trimmed);
}

const FIELD_DROPDOWN_CATEGORY: Record<string, string> = {
  gender: "gender",
  marital_status: "marital_status",
  complexion: "complexion",
  religion: "religion",
  has_beard: "has_beard",
  hasBeard: "has_beard",
  smoking_habit: "smoking_habit",
  smokingHabit: "smoking_habit",
  prayer_practice: "prayer_practice",
  hijab_practice: "hijab_practice",
  highest_degree: "education",
  education_medium: "education_medium",
  education_subject: "education_subject",
  occupation: "occupation",
  monthly_income: "income_range",
  current_division: "division",
  permanent_division: "division",
  current_district: "district",
  permanent_district: "district",
  father_education: "education",
  mother_education: "education",
  father_profession: "occupation",
  mother_profession: "occupation",
  father_is_alive: "is_alive",
  mother_is_alive: "is_alive",
  family_type: "family_type",
  family_status: "family_status",
  minimumEducation: "education",
  preferredProfession: "occupation",
  preferredReligion: "religion",
  beardPreference: "beard_preference",
  prayerPreference: "prayer_preference",
  hijabPreference: "hijab_preference",
  maritalStatusPref: "marital_status",
  preferredDistricts: "district",
  relationship: "sibling_relationship",
  maritalStatus: "marital_status",
  education: "education",
  profession: "occupation",
  spouseEducation: "education",
  spouseProfession: "occupation",
  highestDegree: "education",
  educationMedium: "education_medium",
  educationSubject: "education_subject",
  monthlyIncomeRange: "income_range",
  fatherEducation: "education",
  motherEducation: "education",
  fatherProfession: "occupation",
  motherProfession: "occupation",
  familyType: "family_type",
  familyStatus: "family_status",
  expected_marriage_timeline: "expected_marriage_timeline",
  expectedMarriageTimeline: "expected_marriage_timeline",
  dowry_expectation: "dowry_expectation",
  dowryExpectation: "dowry_expectation",
  wedding_ceremony_preference: "wedding_ceremony_preference",
  weddingCeremonyPreference: "wedding_ceremony_preference",
  expected_parenthood_timeline: "expected_parenthood_timeline",
  expectedParenthoodTimeline: "expected_parenthood_timeline",
  living_arrangements: "living_arrangements",
  livingArrangements: "living_arrangements",
  currentDivision: "division",
  currentDistrict: "district",
  currentUpazila: "upazila",
  permanentDivision: "division",
  permanentDistrict: "district",
  permanentUpazila: "upazila",
};

export const STATIC_OPTION_GROUPS: Record<string, string> = {
  has_beard: "hasBeardOptions",
  hasBeard: "hasBeardOptions",
  smoking_habit: "smokingHabitOptions",
  smokingHabit: "smokingHabitOptions",
  expected_marriage_timeline: "expectedMarriageTimelineOptions",
  expectedMarriageTimeline: "expectedMarriageTimelineOptions",
  dowry_expectation: "dowryExpectationOptions",
  dowryExpectation: "dowryExpectationOptions",
  wedding_ceremony_preference: "weddingCeremonyPreferenceOptions",
  weddingCeremonyPreference: "weddingCeremonyPreferenceOptions",
  expected_parenthood_timeline: "expectedParenthoodTimelineOptions",
  expectedParenthoodTimeline: "expectedParenthoodTimelineOptions",
  living_arrangements: "livingArrangementsOptions",
  livingArrangements: "livingArrangementsOptions",
  prayer_practice: "prayerPracticeOptions",
  hijab_practice: "hijabPracticeOptions",
  father_is_alive: "isAliveOptions",
  mother_is_alive: "isAliveOptions",
  beardPreference: "beardPreferenceOptions",
  prayerPreference: "prayerPreferenceOptions",
  hijabPreference: "hijabPreferenceOptions",
};

export const STATIC_OPTION_FALLBACKS: Record<string, Record<string, string>> = {
  hasBeardOptions: {
    yes: "Yes",
    no: "No",
    prefer_not_to_say: "Do not want to say",
  },
  smokingHabitOptions: {
    yes: "Yes",
    no: "No",
    prefer_not_to_share: "Do not want to share",
  },
  expectedMarriageTimelineOptions: {
    one_year: "1 Year",
    two_years: "2 Years",
    as_soon_as_possible: "As soon as possible",
  },
  dowryExpectationOptions: {
    yes: "Yes",
    no: "No",
    can_be_discussed: "Can be discussed and negotiated",
    prefer_not_to_share: "Not willing to share now",
  },
  weddingCeremonyPreferenceOptions: {
    simple: "Simple",
    modest: "Modest",
    grand: "Grand",
    can_be_discussed_later: "Can be discussed later",
  },
  expectedParenthoodTimelineOptions: {
    within_one_year: "Within a year",
    within_two_years: "Within 2 years",
    within_three_four_years: "Within 3–4 years",
    can_be_agreed_later: "Can be agreed later",
  },
  livingArrangementsOptions: {
    live_with_my_family: "Live with my family",
    live_away_from_my_family: "Live away from my family",
    can_be_discussed_later: "Can be discussed and agreed later",
    live_with_family_2_3_years: "Live with my family for 2–3 years",
    other_arrangements: "Other arrangements",
    dont_intend_live_with_in_laws: "I don't intend to live with in-laws",
    intend_live_with_in_laws: "I intend to live with in-laws",
    no_preference: "I have no preference",
    live_separately_after_2_3_years:
      "Intend to live separately away from in-laws after 2–3 years",
  },
  prayerPracticeOptions: {
    five_times_regularly: "Pray 5 times regularly",
    occasionally: "Pray occasionally",
    friday_only: "Pray only on Friday",
    never: "Never pray",
    prefer_not_to_say: "Do not want to share",
  },
  hijabPracticeOptions: {
    wear_regularly: "I wear Hijab regularly",
    wear_occasionally: "I wear Hijab occasionally",
    never_wear: "I never wear Hijab",
    intend_to_wear: "I intend to wear Hijab",
  },
  isAliveOptions: {
    yes: "Yes",
    no: "No",
    prefer_not_to_say: "Do not want to share",
  },
  beardPreferenceOptions: {
    yes: "Yes",
    no: "No",
    no_opinion: "No opinion",
  },
  prayerPreferenceOptions: {
    regular_five_times: "Regular 5 times",
    no_opinion: "No opinion",
    modestly_practicing: "Modestly practicing",
  },
  hijabPreferenceOptions: {
    regular_hijabi_partner: "Want regular Hijabi partner",
    irregular_hijabi_ok: "Irregular Hijabi partner is ok",
    no_hijab_needed: "No need to wear Hijab",
    intention_to_wear_hijab: "Should have intention to wear Hijab",
  },
};

export function resolveStaticOptionLabel(
  fieldKey: string,
  value: string,
  translate?: (relativeKey: string) => string,
): string | undefined {
  const group = STATIC_OPTION_GROUPS[fieldKey];
  if (!group) return undefined;

  if (translate) {
    const label = translate(`${group}.${value}`);
    if (label && label !== `${group}.${value}`) {
      return label;
    }
  }

  return STATIC_OPTION_FALLBACKS[group]?.[value];
}

export function createFieldOptionResolver(
  translate: (relativeKey: string) => string,
) {
  return (fieldKey: string, value: string) =>
    resolveStaticOptionLabel(fieldKey, value, translate);
}

export function lookupDropdownLabel(
  dropdowns: DropdownMap,
  category: string | undefined,
  value: string,
): string | undefined {
  if (!category) return undefined;
  return dropdowns[category]?.find((item) => item.value === value)?.label;
}

export function formatBiodataFieldValue(
  key: string,
  value: unknown,
  options: {
    locale: AppLocale | string;
    dropdowns: DropdownMap;
    personal?: Record<string, unknown>;
    resolveStaticOption?: (key: string, value: string) => string | undefined;
    yesLabel?: string;
    noLabel?: string;
    relativeRelationGroup?: string;
    translateField?: (key: string) => string;
    allDistrictsLabel?: string;
    anyReligionLabel?: string;
  },
): string {
  const {
    locale,
    dropdowns,
    personal,
    resolveStaticOption,
    yesLabel,
    noLabel,
    relativeRelationGroup,
    translateField,
    allDistrictsLabel,
    anyReligionLabel,
  } = options;

  if (value === null || value === undefined || value === "") {
    if (key === "preferredReligion") {
      return anyReligionLabel ?? "Any religion";
    }
    return "—";
  }

  if (key === "heightCm" && personal?.heightCm != null) {
    return formatHeightFromCm(personal.heightCm) ?? "—";
  }

  if (key === "height" && personal?.height_cm != null) {
    return formatHeightFromCm(personal.height_cm) ?? "—";
  }

  if (key === "weight" && typeof value === "number") {
    return `${value} kg`;
  }

  if (
    (key === "expected_kabin_amount_min_bdt" ||
      key === "expected_kabin_amount_max_bdt" ||
      key === "expectedKabinAmountMinBdt" ||
      key === "expectedKabinAmountMaxBdt") &&
    typeof value === "number"
  ) {
    return `${value.toLocaleString(String(locale))} BDT`;
  }

  if (
    (key === "heightMinCm" || key === "heightMaxCm") &&
    typeof value === "number"
  ) {
    return formatHeightFromCm(value) ?? "—";
  }

  if (
    (key === "weightMinKg" || key === "weightMaxKg") &&
    typeof value === "number"
  ) {
    return `${value} kg`;
  }

  if (key === "date_of_birth" && typeof value === "string") {
    const formatted = isoDateToDisplay(value);
    if (formatted) return formatted;
  }

  if (Array.isArray(value)) {
    if (key === "preferredDistricts" && isOpenToAllDistricts(value)) {
      return allDistrictsLabel ?? "All districts of Bangladesh";
    }
    const category = FIELD_DROPDOWN_CATEGORY[key];
    return value
      .map((item) => {
        const raw = String(item);
        return resolveFieldItemLabel(key, raw, category, {
          dropdowns,
          resolveStaticOption,
        });
      })
      .join(", ");
  }

  if (typeof value === "boolean") {
    return value ? (yesLabel ?? "Yes") : (noLabel ?? "No");
  }

  const raw = String(value);

  if (
    MULTI_VALUE_COMMA_FIELDS.has(key) &&
    raw.includes(",")
  ) {
    const category = FIELD_DROPDOWN_CATEGORY[key];
    return raw
      .split(",")
      .map((part) =>
        resolveFieldItemLabel(key, part, category, {
          dropdowns,
          resolveStaticOption,
        }),
      )
      .join(", ");
  }

  if (key === "preferredReligion" && isAnyReligionPreferenceText(raw)) {
    return anyReligionLabel ?? "Any religion";
  }
  if (key === "preferredReligion" && isOpenToAnyReligion(raw)) {
    return anyReligionLabel ?? "Any religion";
  }

  if (
    key === "preferredDistricts" &&
    isAllBangladeshDistrictsPreferenceText(raw)
  ) {
    return allDistrictsLabel ?? "All districts of Bangladesh";
  }

  if (key === "relation" && relativeRelationGroup && translateField) {
    const label = translateField(`${relativeRelationGroup}.${raw}`);
    if (label && label !== `${relativeRelationGroup}.${raw}`) {
      return label;
    }
  }

  const category = FIELD_DROPDOWN_CATEGORY[key];
  if (key === "living_arrangements" || key === "livingArrangements") {
    const gender =
      typeof personal?.gender === "string" ? personal.gender : undefined;
    const livingCategory = getLivingArrangementsDropdownCategory(gender);
    const fromLivingDropdown = lookupDropdownLabel(
      dropdowns,
      livingCategory ?? undefined,
      raw,
    );
    if (fromLivingDropdown) return fromLivingDropdown;
  } else {
    const fromDropdown = lookupDropdownLabel(dropdowns, category, raw);
    if (fromDropdown) return fromDropdown;
  }

  const fromStatic =
    resolveStaticOption?.(key, raw) ?? resolveStaticOptionLabel(key, raw);
  if (fromStatic) return fromStatic;

  if (category) {
    return formatUnresolvedFieldLabel(raw);
  }

  return raw;
}

/** @deprecated Use formatBiodataFieldValue for discovery profile rows. */
export function formatPersonalFieldValue(
  key: string,
  value: unknown,
  dropdowns: DropdownMap = {},
  locale: AppLocale = "en",
): string | null {
  const formatted = formatBiodataFieldValue(key, value, {
    locale,
    dropdowns,
  });
  return formatted === "—" ? null : formatted;
}
