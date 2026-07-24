"use client";

import {
  EXPECTED_KABIN_AMOUNT_BDT_MAX,
  EXPECTED_KABIN_AMOUNT_BDT_MIN,
  EXPECTED_MARRIAGE_TIMELINE_VALUES,
  EXPECTED_PARENTHOOD_TIMELINE_VALUES,
  DOWRY_EXPECTATION_VALUES,
  WEDDING_CEREMONY_PREFERENCE_VALUES,
  getLivingArrangementsDropdownCategory,
  LIVING_ARRANGEMENTS_FEMALE_VALUES,
  LIVING_ARRANGEMENTS_MALE_VALUES,
  LIVING_ARRANGEMENTS_OTHER_MALE_VALUE,
  showDowryExpectationField,
  showLivingArrangementsOtherField,
} from "@easymatch/shared";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { FieldLabel } from "@/components/FieldLabel";
import type { DropdownMap } from "@/lib/api";

export type MaritalFormState = {
  expectedMarriageTimeline: string;
  dowryExpectation: string;
  weddingCeremonyPreference: string;
  expectedParenthoodTimeline: string;
  livingArrangements: string;
  livingArrangementsOther: string;
  expectedKabinAmountMinBdt: string;
  expectedKabinAmountMaxBdt: string;
};

type Props = {
  marital: MaritalFormState;
  gender: string;
  dropdowns: DropdownMap;
  onChange: (next: MaritalFormState) => void;
  tf: (key: string) => string;
};

function fallbackOptions(
  values: readonly string[],
  tf: (key: string) => string,
  prefix: string,
) {
  return values.map((value) => ({
    value,
    label: tf(`${prefix}.${value}`),
  }));
}

function dropdownOrFallback(
  dropdowns: DropdownMap,
  category: string,
  values: readonly string[],
  tf: (key: string) => string,
  prefix: string,
) {
  if (dropdowns[category]?.length) return dropdowns[category];
  return fallbackOptions(values, tf, prefix);
}

function MaritalSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const tc = useTranslations("common");
  return (
    <label className="block space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      >
        <option value="">{tc("select")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MaritalInformationTab({
  marital,
  gender,
  dropdowns,
  onChange,
  tf,
}: Props) {
  const livingCategory = getLivingArrangementsDropdownCategory(gender);
  const livingFallback =
    gender === "male"
      ? LIVING_ARRANGEMENTS_MALE_VALUES
      : LIVING_ARRANGEMENTS_FEMALE_VALUES;

  const marriageTimelineOptions = useMemo(
    () =>
      dropdownOrFallback(
        dropdowns,
        "expected_marriage_timeline",
        EXPECTED_MARRIAGE_TIMELINE_VALUES,
        tf,
        "expectedMarriageTimelineOptions",
      ),
    [dropdowns, tf],
  );
  const dowryOptions = useMemo(
    () =>
      dropdownOrFallback(
        dropdowns,
        "dowry_expectation",
        DOWRY_EXPECTATION_VALUES,
        tf,
        "dowryExpectationOptions",
      ),
    [dropdowns, tf],
  );
  const weddingOptions = useMemo(
    () =>
      dropdownOrFallback(
        dropdowns,
        "wedding_ceremony_preference",
        WEDDING_CEREMONY_PREFERENCE_VALUES,
        tf,
        "weddingCeremonyPreferenceOptions",
      ),
    [dropdowns, tf],
  );
  const parenthoodOptions = useMemo(
    () =>
      dropdownOrFallback(
        dropdowns,
        "expected_parenthood_timeline",
        EXPECTED_PARENTHOOD_TIMELINE_VALUES,
        tf,
        "expectedParenthoodTimelineOptions",
      ),
    [dropdowns, tf],
  );
  const livingOptions = useMemo(
    () =>
      livingCategory
        ? dropdownOrFallback(
            dropdowns,
            livingCategory,
            livingFallback,
            tf,
            "livingArrangementsOptions",
          )
        : [],
    [dropdowns, livingCategory, livingFallback, tf],
  );

  const patch = (partial: Partial<MaritalFormState>) =>
    onChange({ ...marital, ...partial });

  return (
    <div className="space-y-4">
      <MaritalSelect
        label={tf("expectedMarriageTimeline")}
        value={marital.expectedMarriageTimeline}
        onChange={(v) => patch({ expectedMarriageTimeline: v })}
        options={marriageTimelineOptions}
      />
      {showDowryExpectationField(gender) ? (
        <MaritalSelect
          label={tf("dowryExpectation")}
          value={marital.dowryExpectation}
          onChange={(v) => patch({ dowryExpectation: v })}
          options={dowryOptions}
        />
      ) : null}
      <MaritalSelect
        label={tf("weddingCeremonyPreference")}
        value={marital.weddingCeremonyPreference}
        onChange={(v) => patch({ weddingCeremonyPreference: v })}
        options={weddingOptions}
      />
      <MaritalSelect
        label={tf("expectedParenthoodTimeline")}
        value={marital.expectedParenthoodTimeline}
        onChange={(v) => patch({ expectedParenthoodTimeline: v })}
        options={parenthoodOptions}
      />
      {livingCategory ? (
        <MaritalSelect
          label={tf("livingArrangements")}
          value={marital.livingArrangements}
          onChange={(livingArrangements) =>
            patch({
              livingArrangements,
              livingArrangementsOther:
                livingArrangements === LIVING_ARRANGEMENTS_OTHER_MALE_VALUE
                  ? marital.livingArrangementsOther
                  : "",
            })
          }
          options={livingOptions}
        />
      ) : null}
      {showLivingArrangementsOtherField(gender, marital.livingArrangements) ? (
        <label className="block space-y-1.5">
          <FieldLabel>{tf("livingArrangementsOther")}</FieldLabel>
          <input
            value={marital.livingArrangementsOther}
            onChange={(e) => patch({ livingArrangementsOther: e.target.value })}
            className="field-input"
          />
        </label>
      ) : null}
      <div className="space-y-1.5">
        <FieldLabel>{tf("expectedKabinAmount")}</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-600">{tf("expectedKabinAmountMin")}</span>
            <input
              type="number"
              min={EXPECTED_KABIN_AMOUNT_BDT_MIN}
              max={EXPECTED_KABIN_AMOUNT_BDT_MAX}
              step={1}
              value={marital.expectedKabinAmountMinBdt}
              onChange={(e) => patch({ expectedKabinAmountMinBdt: e.target.value })}
              className="field-input"
              inputMode="numeric"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-600">{tf("expectedKabinAmountMax")}</span>
            <input
              type="number"
              min={EXPECTED_KABIN_AMOUNT_BDT_MIN}
              max={EXPECTED_KABIN_AMOUNT_BDT_MAX}
              step={1}
              value={marital.expectedKabinAmountMaxBdt}
              onChange={(e) => patch({ expectedKabinAmountMaxBdt: e.target.value })}
              className="field-input"
              inputMode="numeric"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-500">{tf("expectedKabinAmountHint")}</p>
      </div>
    </div>
  );
}
