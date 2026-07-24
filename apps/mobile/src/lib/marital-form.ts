import {
  getLivingArrangementsDropdownCategory,
  LIVING_ARRANGEMENTS_OTHER_MALE_VALUE,
  isValidExpectedKabinAmountRange,
  parseExpectedKabinAmountInput,
  showDowryExpectationField,
  showLivingArrangementsOtherField,
} from "@easymatch/shared";
import type { MaritalFormState, MemberProfile } from "../types/profile";

export function emptyMaritalForm(): MaritalFormState {
  return {
    expectedMarriageTimeline: "",
    dowryExpectation: "",
    weddingCeremonyPreference: "",
    expectedParenthoodTimeline: "",
    livingArrangements: "",
    livingArrangementsOther: "",
    expectedKabinAmountMinBdt: "",
    expectedKabinAmountMaxBdt: "",
  };
}

export function profileToMaritalForm(profile: MemberProfile): MaritalFormState {
  return {
    expectedMarriageTimeline: profile.expectedMarriageTimeline ?? "",
    dowryExpectation: profile.dowryExpectation ?? "",
    weddingCeremonyPreference: profile.weddingCeremonyPreference ?? "",
    expectedParenthoodTimeline: profile.expectedParenthoodTimeline ?? "",
    livingArrangements: profile.livingArrangements ?? "",
    livingArrangementsOther: profile.livingArrangementsOther ?? "",
    expectedKabinAmountMinBdt:
      profile.expectedKabinAmountMinBdt != null
        ? String(profile.expectedKabinAmountMinBdt)
        : "",
    expectedKabinAmountMaxBdt:
      profile.expectedKabinAmountMaxBdt != null
        ? String(profile.expectedKabinAmountMaxBdt)
        : "",
  };
}

export function buildUpdateMaritalPayload(
  form: MaritalFormState,
  gender: string | null | undefined,
) {
  const payload: Record<string, string | number | null | undefined> = {
    expectedMarriageTimeline: form.expectedMarriageTimeline || undefined,
    weddingCeremonyPreference: form.weddingCeremonyPreference || undefined,
    expectedParenthoodTimeline: form.expectedParenthoodTimeline || undefined,
    livingArrangements: form.livingArrangements || undefined,
    expectedKabinAmountMinBdt: parseExpectedKabinAmountInput(
      form.expectedKabinAmountMinBdt,
    ),
    expectedKabinAmountMaxBdt: parseExpectedKabinAmountInput(
      form.expectedKabinAmountMaxBdt,
    ),
  };

  if (showDowryExpectationField(gender)) {
    payload.dowryExpectation = form.dowryExpectation || undefined;
  }

  if (showLivingArrangementsOtherField(gender, form.livingArrangements)) {
    payload.livingArrangementsOther =
      form.livingArrangementsOther.trim() || undefined;
  }

  return payload;
}

export {
  getLivingArrangementsDropdownCategory,
  isValidExpectedKabinAmountRange,
  LIVING_ARRANGEMENTS_OTHER_MALE_VALUE,
  parseExpectedKabinAmountInput,
  showDowryExpectationField,
  showLivingArrangementsOtherField,
};
