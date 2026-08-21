import {
  cmToFeetInches,
  minMarriageAgeForPartnerPreference,
  normalizeHijabPreference,
  PROFILE_AGE_MAX,
  showBeardPreferenceField,
  showHijabPreferenceField,
  showPrayerPreferenceField,
} from "@easymatch/shared";
import { getAgeInputError } from "./age-validation";
import { getWeightInputError } from "./weight-validation";
import type { MemberProfile, PartnerFormState, PartnerPreference } from "../types/profile";

export function emptyPartnerForm(): PartnerFormState {
  return {
    ageMin: "",
    ageMax: "",
    heightMinFeet: "",
    heightMinInches: "",
    heightMaxFeet: "",
    heightMaxInches: "",
    weightMinKg: "",
    weightMaxKg: "",
    preferredDistricts: [],
    preferredProfession: [],
    minimumEducation: "",
    beardPreference: "",
    prayerPreference: "",
    hijabPreference: "",
    maritalStatusPref: [],
    additionalNotes: "",
  };
}

function heightToFormFields(cm: number | null | undefined) {
  if (cm == null) {
    return { feet: "", inches: "" };
  }
  const { feet, inches } = cmToFeetInches(cm);
  return { feet: String(feet), inches: String(inches) };
}

export function profileToPartnerForm(
  partner: PartnerPreference | null | undefined,
): PartnerFormState {
  const minHeight = heightToFormFields(partner?.heightMinCm);
  const maxHeight = heightToFormFields(partner?.heightMaxCm);

  return {
    ageMin: partner?.ageMin?.toString() ?? "",
    ageMax: partner?.ageMax?.toString() ?? "",
    heightMinFeet: minHeight.feet,
    heightMinInches: minHeight.inches,
    heightMaxFeet: maxHeight.feet,
    heightMaxInches: maxHeight.inches,
    weightMinKg: partner?.weightMinKg?.toString() ?? "",
    weightMaxKg: partner?.weightMaxKg?.toString() ?? "",
    preferredDistricts: partner?.preferredDistricts ?? [],
    preferredProfession: partner?.preferredProfession ?? [],
    minimumEducation: partner?.minimumEducation ?? "",
    beardPreference: partner?.beardPreference ?? "",
    prayerPreference: partner?.prayerPreference ?? "",
    hijabPreference:
      normalizeHijabPreference(partner?.hijabPreference ?? "") ??
      partner?.hijabPreference ??
      "",
    maritalStatusPref: Array.isArray(partner?.maritalStatusPref)
      ? partner.maritalStatusPref
      : partner?.maritalStatusPref
        ? [partner.maritalStatusPref]
        : [],
    additionalNotes: partner?.additionalNotes ?? "",
  };
}

export function validatePartnerForm(
  form: PartnerFormState,
  messages: {
    ageMinRequired: string;
    ageInvalid: string;
    ageRange: string;
    weightInvalid: string;
    weightRange: string;
  },
  memberGender?: string | null,
): string | null {
  const minAge = minMarriageAgeForPartnerPreference(memberGender);
  const ageRange = messages.ageRange
    .replace("{min}", String(minAge))
    .replace("{max}", String(PROFILE_AGE_MAX));
  if (!form.ageMin.trim()) return messages.ageMinRequired;
  const ageMinError = getAgeInputError(
    form.ageMin,
    {
      invalid: messages.ageInvalid,
      range: ageRange,
    },
    { min: minAge },
  );
  if (ageMinError) return ageMinError;
  const ageMaxError = getAgeInputError(
    form.ageMax,
    {
      invalid: messages.ageInvalid,
      range: ageRange,
    },
    { min: minAge },
  );
  if (ageMaxError) return ageMaxError;
  const weightMinError = getWeightInputError(form.weightMinKg, {
    invalid: messages.weightInvalid,
    range: messages.weightRange,
  });
  if (weightMinError) return weightMinError;
  const weightMaxError = getWeightInputError(form.weightMaxKg, {
    invalid: messages.weightInvalid,
    range: messages.weightRange,
  });
  if (weightMaxError) return weightMaxError;
  return null;
}

export function buildUpdatePartnerPayload(
  form: PartnerFormState,
  personal: { religion: string; gender: string },
) {
  return {
    ageMin: form.ageMin.trim() ? Number(form.ageMin) : undefined,
    ageMax: form.ageMax.trim() ? Number(form.ageMax) : undefined,
    heightUnit: "ft_in" as const,
    heightMinFeet: form.heightMinFeet.trim() ? Number(form.heightMinFeet) : undefined,
    heightMinInches: form.heightMinInches.trim() ? Number(form.heightMinInches) : undefined,
    heightMaxFeet: form.heightMaxFeet.trim() ? Number(form.heightMaxFeet) : undefined,
    heightMaxInches: form.heightMaxInches.trim() ? Number(form.heightMaxInches) : undefined,
    weightMinKg: form.weightMinKg.trim() ? Number(form.weightMinKg) : undefined,
    weightMaxKg: form.weightMaxKg.trim() ? Number(form.weightMaxKg) : undefined,
    preferredDistricts: form.preferredDistricts,
    minimumEducation: form.minimumEducation || undefined,
    preferredProfession: form.preferredProfession,
    beardPreference: showBeardPreferenceField(personal.religion, personal.gender)
      ? form.beardPreference || undefined
      : undefined,
    prayerPreference: showPrayerPreferenceField(personal.religion)
      ? form.prayerPreference || undefined
      : undefined,
    hijabPreference: showHijabPreferenceField(personal.religion, personal.gender)
      ? form.hijabPreference || undefined
      : undefined,
    maritalStatusPref: form.maritalStatusPref,
    additionalNotes: form.additionalNotes.trim() || undefined,
  };
}

export function readPartnerFromProfile(profile: MemberProfile): PartnerFormState {
  return profileToPartnerForm(profile.partnerPreference);
}
