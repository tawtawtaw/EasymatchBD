import type { ComparisonCriterionKey } from "@easymatch/shared";

export const COMPARISON_ATTRIBUTE_FIELD: Record<ComparisonCriterionKey, string> = {
  age: "date_of_birth",
  height: "heightCm",
  weight: "weightKg",
  district: "current_district",
  education: "highest_degree",
  profession: "occupation",
  marital_status: "marital_status",
  religion: "religion",
  beard: "has_beard",
  prayer: "prayer_practice",
  hijab: "hijab_practice",
};

export const COMPARISON_PREFERENCE_FIELD: Record<ComparisonCriterionKey, string> = {
  age: "ageMin",
  height: "heightMinCm",
  weight: "weightMinKg",
  district: "preferredDistricts",
  education: "minimumEducation",
  profession: "preferredProfession",
  marital_status: "maritalStatusPref",
  religion: "preferredReligion",
  beard: "beardPreference",
  prayer: "prayerPreference",
  hijab: "hijabPreference",
};
