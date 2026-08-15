import {
  cmToFeetInches,
  FEET_MAX,
  FEET_MIN,
  isBangladeshAddress,
  isIslamReligion,
  isValidDisplayDate,
  displayDateToIso,
  isoDateToDisplay,
  isDivorcedMaritalStatus,
  requiresChildrenCountMaritalStatus,
  sanitizeChildrenCountInput,
  CHILDREN_COUNT_MAX,
  showHasBeardField,
  showHijabPracticeField,
  showSmokingHabitField,
  SMOKING_HABIT_VALUES,
} from "@easymatch/shared";
import type { MemberProfile, PersonalFormState } from "../types/profile";
import { isRequiredValueFilled } from "./biodata-required";
import { getWeightInputError } from "./weight-validation";

export type PersonalFormValidationMessages = {
  dateOfBirthRequired: string;
  dateOfBirthInvalid: string;
  prayerPracticeRequired: string;
  introductionRequired: string;
  childrenCountRequired: string;
  childrenCountInvalid: string;
  childrenCountMax: string;
  smokingHabitRequired: string;
  weightInvalid: string;
  weightRange: string;
  heightInvalid: string;
  fieldRequired: string;
  gender: string;
  maritalStatus: string;
  religion: string;
  occupation: string;
  educationMedium: string;
  highestQualification: string;
  division: string;
  district: string;
  cityTown: string;
  addressLine: string;
};

function requiredField(messages: PersonalFormValidationMessages, field: string) {
  return messages.fieldRequired.replace("{field}", field);
}

export function emptyPersonalForm(): PersonalFormState {
  return {
    fullName: "",
    gender: "",
    dateOfBirth: "",
    maritalStatus: "",
    divorceDetails: "",
    childrenCount: "",
    heightFeet: "",
    heightInches: "",
    weightKg: "",
    complexion: "",
    hasDisability: false,
    disabilityInfo: "",
    religion: "",
    hasBeard: "",
    smokingHabit: "",
    prayerPractice: "",
    hijabPractice: "",
    highestDegree: "",
    educationMedium: "",
    additionalEducationQualifications: "",
    institution: "",
    educationYear: "",
    educationSubject: "",
    occupation: "",
    company: "",
    designation: "",
    monthlyIncomeRange: "",
    currentCountry: "Bangladesh",
    currentDivision: "",
    currentDistrict: "",
    currentUpazila: "",
    currentCityTown: "",
    currentAddressLine: "",
    permanentCountry: "Bangladesh",
    permanentDivision: "",
    permanentDistrict: "",
    permanentUpazila: "",
    permanentCityTown: "",
    permanentAddressLine: "",
    permanentSameAsCurrent: false,
    biography: "",
    hobbies: "",
    interests: "",
    introduction: "",
  };
}

export function profileToPersonalForm(profile: MemberProfile): PersonalFormState {
  const height = profile.heightCm != null ? cmToFeetInches(profile.heightCm) : null;

  return {
    fullName: profile.fullName ?? "",
    gender: profile.gender ?? "",
    dateOfBirth: isoDateToDisplay(profile.dateOfBirth),
    maritalStatus: profile.maritalStatus ?? "",
    divorceDetails: profile.divorceDetails ?? "",
    childrenCount:
      profile.childrenCount != null ? String(profile.childrenCount) : "",
    heightFeet: height ? String(height.feet) : "",
    heightInches: height ? String(height.inches) : "",
    weightKg: profile.weightKg?.toString() ?? "",
    complexion: profile.complexion ?? "",
    hasDisability: profile.hasDisability ?? false,
    disabilityInfo: profile.disabilityInfo ?? "",
    religion: profile.religion ?? "",
    hasBeard: profile.hasBeard ?? "",
    smokingHabit: profile.smokingHabit ?? "",
    prayerPractice: profile.prayerPractice ?? "",
    hijabPractice: profile.hijabPractice ?? "",
    highestDegree: profile.highestDegree ?? "",
    educationMedium: profile.educationMedium ?? "",
    additionalEducationQualifications: profile.additionalEducationQualifications ?? "",
    institution: profile.institution ?? "",
    educationYear: profile.educationYear?.toString() ?? "",
    educationSubject: profile.educationSubject ?? "",
    occupation: profile.occupation ?? "",
    company: profile.company ?? "",
    designation: profile.designation ?? "",
    monthlyIncomeRange: profile.monthlyIncomeRange ?? "",
    currentCountry: profile.currentCountry ?? "Bangladesh",
    currentDivision: profile.currentDivision ?? "",
    currentDistrict: profile.currentDistrict ?? "",
    currentUpazila: profile.currentUpazila ?? "",
    currentCityTown: profile.currentCityTown ?? "",
    currentAddressLine: profile.currentAddressLine ?? "",
    permanentCountry: profile.permanentCountry ?? "Bangladesh",
    permanentDivision: profile.permanentDivision ?? "",
    permanentDistrict: profile.permanentDistrict ?? "",
    permanentUpazila: profile.permanentUpazila ?? "",
    permanentCityTown: profile.permanentCityTown ?? "",
    permanentAddressLine: profile.permanentAddressLine ?? "",
    permanentSameAsCurrent: profile.permanentSameAsCurrent ?? false,
    biography: profile.biography ?? "",
    hobbies: profile.hobbies?.join(", ") ?? "",
    interests: profile.interests ?? "",
    introduction: profile.introduction ?? "",
  };
}

export { isDivorcedMaritalStatus, requiresChildrenCountMaritalStatus } from "@easymatch/shared";

export function validatePersonalForm(
  form: PersonalFormState,
  messages: PersonalFormValidationMessages,
): string | null {
  if (!isRequiredValueFilled(form.gender)) {
    return requiredField(messages, messages.gender);
  }
  if (!form.dateOfBirth.trim()) {
    return messages.dateOfBirthRequired;
  }
  if (!isValidDisplayDate(form.dateOfBirth)) {
    return messages.dateOfBirthInvalid;
  }
  if (!isRequiredValueFilled(form.maritalStatus)) {
    return requiredField(messages, messages.maritalStatus);
  }
  if (!isRequiredValueFilled(form.religion)) {
    return requiredField(messages, messages.religion);
  }
  if (isIslamReligion(form.religion) && !form.prayerPractice.trim()) {
    return messages.prayerPracticeRequired;
  }
  if (!form.introduction.trim()) {
    return messages.introductionRequired;
  }
  if (requiresChildrenCountMaritalStatus(form.maritalStatus)) {
    if (!form.childrenCount.trim()) {
      return messages.childrenCountRequired;
    }
    if (!/^\d+$/.test(form.childrenCount)) {
      return messages.childrenCountInvalid;
    }
    const count = Number(form.childrenCount);
    if (count > CHILDREN_COUNT_MAX) {
      return messages.childrenCountMax;
    }
  }
  if (showSmokingHabitField(form.gender) && !form.smokingHabit.trim()) {
    return messages.smokingHabitRequired;
  }
  if (!isRequiredValueFilled(form.educationMedium)) {
    return requiredField(messages, messages.educationMedium);
  }
  if (!isRequiredValueFilled(form.highestDegree)) {
    return requiredField(messages, messages.highestQualification);
  }
  if (!isRequiredValueFilled(form.occupation)) {
    return requiredField(messages, messages.occupation);
  }

  const currentIsBd = isBangladeshAddress(form.currentCountry);
  if (currentIsBd) {
    if (!isRequiredValueFilled(form.currentDivision)) {
      return requiredField(messages, messages.division);
    }
    if (!isRequiredValueFilled(form.currentDistrict)) {
      return requiredField(messages, messages.district);
    }
  } else {
    if (!isRequiredValueFilled(form.currentCityTown)) {
      return requiredField(messages, messages.cityTown);
    }
    if (!isRequiredValueFilled(form.currentAddressLine)) {
      return requiredField(messages, messages.addressLine);
    }
  }

  if (!form.permanentSameAsCurrent) {
    const permanentIsBd = isBangladeshAddress(form.permanentCountry);
    if (permanentIsBd) {
      if (!isRequiredValueFilled(form.permanentDivision)) {
        return requiredField(messages, messages.division);
      }
      if (!isRequiredValueFilled(form.permanentDistrict)) {
        return requiredField(messages, messages.district);
      }
    } else {
      if (!isRequiredValueFilled(form.permanentCityTown)) {
        return requiredField(messages, messages.cityTown);
      }
      if (!isRequiredValueFilled(form.permanentAddressLine)) {
        return requiredField(messages, messages.addressLine);
      }
    }
  }

  const weightError = getWeightInputError(form.weightKg, {
    invalid: messages.weightInvalid,
    range: messages.weightRange,
  });
  if (weightError) {
    return weightError;
  }
  if (form.heightFeet.trim()) {
    const feet = Number(form.heightFeet);
    const inches = form.heightInches.trim() ? Number(form.heightInches) : 0;
    if (
      Number.isNaN(feet) ||
      feet < FEET_MIN ||
      feet > FEET_MAX ||
      Number.isNaN(inches) ||
      inches < 0 ||
      inches > 11
    ) {
      return messages.heightInvalid;
    }
  }
  return null;
}

export function buildUpdatePersonalPayload(form: PersonalFormState) {
  const isoDate = isValidDisplayDate(form.dateOfBirth)
    ? displayDateToIso(form.dateOfBirth.trim())
    : undefined;

  return {
    fullName: form.fullName.trim() || undefined,
    gender: form.gender || undefined,
    dateOfBirth: isoDate ?? undefined,
    maritalStatus: form.maritalStatus || undefined,
    divorceDetails: isDivorcedMaritalStatus(form.maritalStatus)
      ? form.divorceDetails.trim() || undefined
      : undefined,
    childrenCount: requiresChildrenCountMaritalStatus(form.maritalStatus)
      ? Number(form.childrenCount)
      : undefined,
    heightUnit: "ft_in" as const,
    heightFeet: form.heightFeet.trim() ? Number(form.heightFeet) : undefined,
    heightInches: form.heightInches.trim() ? Number(form.heightInches) : undefined,
    weightKg: form.weightKg.trim() ? Number(form.weightKg) : undefined,
    complexion: form.complexion || undefined,
    hasDisability: form.hasDisability,
    disabilityInfo: form.hasDisability
      ? form.disabilityInfo.trim() || undefined
      : undefined,
    religion: form.religion || undefined,
    hasBeard: showHasBeardField(form.religion, form.gender)
      ? form.hasBeard || undefined
      : undefined,
    smokingHabit: showSmokingHabitField(form.gender)
      ? form.smokingHabit || undefined
      : undefined,
    prayerPractice: isIslamReligion(form.religion)
      ? form.prayerPractice || undefined
      : undefined,
    hijabPractice: showHijabPracticeField(form.religion, form.gender)
      ? form.hijabPractice || undefined
      : undefined,
    highestDegree: form.highestDegree || undefined,
    educationMedium: form.educationMedium || undefined,
    additionalEducationQualifications:
      form.additionalEducationQualifications.trim() || undefined,
    institution: form.institution.trim() || undefined,
    educationYear: form.educationYear.trim() ? Number(form.educationYear) : undefined,
    educationSubject: form.educationSubject || undefined,
    occupation: form.occupation || undefined,
    company: form.company.trim() || undefined,
    designation: form.designation.trim() || undefined,
    monthlyIncomeRange: form.monthlyIncomeRange || undefined,
    currentCountry: form.currentCountry.trim() || undefined,
    currentDivision: form.currentDivision || undefined,
    currentDistrict: form.currentDistrict || undefined,
    currentUpazila: form.currentUpazila.trim() || undefined,
    currentCityTown: form.currentCityTown.trim() || undefined,
    currentAddressLine: form.currentAddressLine.trim() || undefined,
    permanentSameAsCurrent: form.permanentSameAsCurrent,
    permanentCountry: form.permanentSameAsCurrent
      ? undefined
      : form.permanentCountry.trim() || undefined,
    permanentDivision: form.permanentSameAsCurrent
      ? undefined
      : form.permanentDivision || undefined,
    permanentDistrict: form.permanentSameAsCurrent
      ? undefined
      : form.permanentDistrict || undefined,
    permanentUpazila: form.permanentSameAsCurrent
      ? undefined
      : form.permanentUpazila.trim() || undefined,
    permanentCityTown: form.permanentSameAsCurrent
      ? undefined
      : form.permanentCityTown.trim() || undefined,
    permanentAddressLine: form.permanentSameAsCurrent
      ? undefined
      : form.permanentAddressLine.trim() || undefined,
    biography: form.biography.trim() || undefined,
    hobbies: form.hobbies
      ? form.hobbies.split(",").map((item) => item.trim()).filter(Boolean)
      : [],
    interests: form.interests.trim() || undefined,
    introduction: form.introduction.trim() || undefined,
  };
}

export function filterDistrictsForDivision(
  districts: { value: string; label: string; parentValue?: string | null }[],
  division: string,
) {
  if (!division) return districts;
  return districts.filter((district) => district.parentValue === division);
}

export function filterUpazilasForDistrict(
  upazilas: { value: string; label: string; parentValue?: string | null }[],
  district: string,
) {
  if (!district) return [];
  return upazilas.filter((upazila) => upazila.parentValue === district);
}
