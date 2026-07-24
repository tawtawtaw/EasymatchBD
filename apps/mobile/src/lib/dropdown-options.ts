import { profileFieldLabel } from "../i18n/biodata-fields";
import type { DropdownMap } from "../types/dropdowns";
import type { AppLocale } from "./locale";

/** Static i18n group prefix when API dropdown category has no options yet. */
export const DROPDOWN_CATEGORY_I18N_PREFIX: Record<string, string> = {
  expected_marriage_timeline: "expectedMarriageTimelineOptions",
  dowry_expectation: "dowryExpectationOptions",
  wedding_ceremony_preference: "weddingCeremonyPreferenceOptions",
  expected_parenthood_timeline: "expectedParenthoodTimelineOptions",
  living_arrangements_male: "livingArrangementsOptions",
  living_arrangements_female: "livingArrangementsOptions",
  has_beard: "hasBeardOptions",
  smoking_habit: "smokingHabitOptions",
  prayer_practice: "prayerPracticeOptions",
  hijab_practice: "hijabPracticeOptions",
  hijab_preference: "hijabPreferenceOptions",
};

export function buildDropdownOptions(
  dropdowns: DropdownMap,
  category: string,
  locale: AppLocale,
  fallbackValues?: readonly string[],
): { value: string; label: string }[] {
  if (dropdowns[category]?.length) {
    return dropdowns[category].map((item) => ({
      value: item.value,
      label: item.label,
    }));
  }

  const prefix = DROPDOWN_CATEGORY_I18N_PREFIX[category];
  return (fallbackValues ?? []).map((value) => {
    if (!prefix) {
      return { value, label: value };
    }
    const translated = profileFieldLabel(locale, `${prefix}.${value}`);
    const label =
      translated !== `${prefix}.${value}` ? translated : value;
    return { value, label };
  });
}
