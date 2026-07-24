"use client";

import {
  cmToFeetInches,
  feetInchesToCm,
  formatHeightFromCm,
  getFeetOptions,
  getInchesOptions,
} from "@easymatch/shared";
import { useTranslations } from "next-intl";
import { DistrictSelectField } from "@/components/DistrictFields";
import type { DropdownMap } from "@/lib/api";
import type { DiscoveryFilters } from "@/lib/discovery";
import { countActiveFilters } from "@/lib/discovery-filters";

type DiscoveryFiltersPanelProps = {
  dropdowns: DropdownMap;
  draft: DiscoveryFilters;
  applied: DiscoveryFilters;
  expanded: boolean;
  onToggle: () => void;
  onDraftChange: (next: DiscoveryFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onUseMyPreferences: () => void;
  showGenderFilter?: boolean;
  hideUseMyPreferences?: boolean;
};

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterNumber({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </label>
  );
}

function FilterHeight({
  label,
  feetLabel,
  inchesLabel,
  selectLabel,
  valueCm,
  onChangeCm,
}: {
  label: string;
  feetLabel: string;
  inchesLabel: string;
  selectLabel: string;
  valueCm: string;
  onChangeCm: (value: string) => void;
}) {
  const parsed = valueCm ? cmToFeetInches(Number(valueCm)) : null;
  const feet = parsed ? String(parsed.feet) : "";
  const inches = parsed ? String(parsed.inches) : "";

  function update(feetValue: string, inchesValue: string) {
    if (!feetValue) {
      onChangeCm("");
      return;
    }
    onChangeCm(
      String(
        feetInchesToCm(
          Number(feetValue),
          inchesValue !== "" ? Number(inchesValue) : 0,
        ),
      ),
    );
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-500">{feetLabel}</span>
          <select
            value={feet}
            onChange={(e) => update(e.target.value, inches)}
            className="field-input"
          >
            <option value="">{selectLabel}</option>
            {getFeetOptions().map((value) => (
              <option key={value} value={value}>
                {value} ft
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-500">{inchesLabel}</span>
          <select
            value={inches}
            onChange={(e) => update(feet, e.target.value)}
            className="field-input"
          >
            <option value="">{selectLabel}</option>
            {getInchesOptions().map((value) => (
              <option key={value} value={value}>
                {value} in
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

const FILTER_LABEL_KEYS: Record<string, string> = {
  profileCode: "filterProfileCode",
  gender: "filterGender",
  division: "filterDivision",
  district: "filterDistrict",
  maritalStatus: "filterMaritalStatus",
  religion: "filterReligion",
  complexion: "filterComplexion",
  education: "filterEducation",
  occupation: "filterOccupation",
  incomeRange: "filterIncome",
  ageMin: "filterAgeMin",
  ageMax: "filterAgeMax",
  heightMinCm: "filterHeightMin",
  heightMaxCm: "filterHeightMax",
  weightMinKg: "filterWeightMin",
  weightMaxKg: "filterWeightMax",
  hasDisability: "filterDisability",
  familyType: "filterFamilyType",
  familyStatus: "filterFamilyStatus",
};

const FILTER_DROPDOWN_CATEGORY: Record<string, string> = {
  gender: "gender",
  maritalStatus: "marital_status",
  religion: "religion",
  complexion: "complexion",
  education: "education",
  occupation: "occupation",
  incomeRange: "income_range",
  division: "division",
  district: "district",
  familyType: "family_type",
  familyStatus: "family_status",
};

function formatFilterChip(
  key: string,
  value: string,
  dropdowns: DropdownMap,
  t: ReturnType<typeof useTranslations<"discovery">>,
) {
  const labelKey = FILTER_LABEL_KEYS[key] ?? key;
  const label = t(labelKey as "filterGender");

  if (key === "hasDisability") {
    return `${label}: ${value === "true" ? t("filterDisabilityYes") : t("filterDisabilityNo")}`;
  }

  if (key === "heightMinCm" || key === "heightMaxCm") {
    const formatted = formatHeightFromCm(Number(value));
    return `${label}: ${formatted ?? value}`;
  }

  const category = FILTER_DROPDOWN_CATEGORY[key];
  const option = category
    ? dropdowns[category]?.find((item) => item.value === value)
    : undefined;

  return `${label}: ${option?.label ?? value}`;
}

function setField(
  draft: DiscoveryFilters,
  key: keyof DiscoveryFilters,
  value: string,
): DiscoveryFilters {
  return { ...draft, [key]: value || undefined };
}

export function DiscoveryFiltersPanel({
  dropdowns,
  draft,
  applied,
  expanded,
  onToggle,
  onDraftChange,
  onApply,
  onClear,
  onUseMyPreferences,
  showGenderFilter = false,
  hideUseMyPreferences = false,
}: DiscoveryFiltersPanelProps) {
  const t = useTranslations("discovery");
  const tc = useTranslations("common");
  const activeCount = countActiveFilters(applied);
  const draftCount = countActiveFilters(draft);

  return (
    <section className="mb-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">
            {t("filtersTitle")}
          </span>
          {activeCount > 0 ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900">
              {t("filtersActive", { count: activeCount })}
            </span>
          ) : null}
        </div>
        <span className="text-xs font-medium text-zinc-500">
          {expanded ? t("collapseFilters") : t("expandFilters")}
        </span>
      </button>

      {!expanded && activeCount > 0 ? (
        <div className="border-t border-zinc-100 px-4 pb-3">
          <p className="mb-2 text-xs text-zinc-500">{t("filtersAppliedSummary")}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(applied).map(([key, value]) =>
              value ? (
                <span
                  key={key}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
                >
                  {formatFilterChip(key, value, dropdowns, t)}
                </span>
              ) : null,
            )}
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="space-y-5 border-t border-zinc-100 px-4 pb-4 pt-4">
          <div className="flex flex-wrap gap-2">
            {!hideUseMyPreferences ? (
              <button
                type="button"
                onClick={onUseMyPreferences}
                className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-50"
              >
                {t("useMyPreferences")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {t("clearFilters")}
            </button>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
              {t("filterSections.search")}
            </h3>
            <label className="block max-w-sm space-y-1.5">
              <span className="text-xs font-medium text-zinc-600">
                {t("filterProfileCode")}
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={draft.profileCode ?? ""}
                onChange={(e) =>
                  onDraftChange(setField(draft, "profileCode", e.target.value))
                }
                placeholder={t("profileCodePlaceholder")}
                className="field-input font-mono"
              />
            </label>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
              {t("filterSections.basic")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {showGenderFilter ? (
                <FilterSelect
                  label={t("filterGender")}
                  value={draft.gender ?? ""}
                  onChange={(gender) =>
                    onDraftChange(setField(draft, "gender", gender))
                  }
                  options={dropdowns.gender ?? []}
                  placeholder={tc("select")}
                />
              ) : null}
              <FilterSelect
                label={t("filterMaritalStatus")}
                value={draft.maritalStatus ?? ""}
                onChange={(maritalStatus) =>
                  onDraftChange(setField(draft, "maritalStatus", maritalStatus))
                }
                options={dropdowns.marital_status ?? []}
                placeholder={tc("select")}
              />
              <FilterSelect
                label={t("filterReligion")}
                value={draft.religion ?? ""}
                onChange={(religion) =>
                  onDraftChange(setField(draft, "religion", religion))
                }
                options={dropdowns.religion ?? []}
                placeholder={tc("select")}
              />
              <FilterSelect
                label={t("filterComplexion")}
                value={draft.complexion ?? ""}
                onChange={(complexion) =>
                  onDraftChange(setField(draft, "complexion", complexion))
                }
                options={dropdowns.complexion ?? []}
                placeholder={tc("select")}
              />
              <FilterSelect
                label={t("filterDisability")}
                value={draft.hasDisability ?? ""}
                onChange={(hasDisability) =>
                  onDraftChange(setField(draft, "hasDisability", hasDisability))
                }
                options={[
                  { value: "false", label: t("filterDisabilityNo") },
                  { value: "true", label: t("filterDisabilityYes") },
                ]}
                placeholder={tc("select")}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
              {t("filterSections.location")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FilterSelect
                label={t("filterDivision")}
                value={draft.division ?? ""}
                onChange={(division) =>
                  onDraftChange({
                    ...draft,
                    division: division || undefined,
                    district: undefined,
                  })
                }
                options={dropdowns.division ?? []}
                placeholder={tc("select")}
              />
              <DistrictSelectField
                label={t("filterDistrict")}
                division={draft.division ?? ""}
                value={draft.district ?? ""}
                onChange={(district) =>
                  onDraftChange(setField(draft, "district", district))
                }
                districts={dropdowns.district ?? []}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
              {t("filterSections.educationCareer")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FilterSelect
                label={t("filterEducation")}
                value={draft.education ?? ""}
                onChange={(education) =>
                  onDraftChange(setField(draft, "education", education))
                }
                options={dropdowns.education ?? []}
                placeholder={tc("select")}
              />
              <FilterSelect
                label={t("filterOccupation")}
                value={draft.occupation ?? ""}
                onChange={(occupation) =>
                  onDraftChange(setField(draft, "occupation", occupation))
                }
                options={dropdowns.occupation ?? []}
                placeholder={tc("select")}
              />
              <FilterSelect
                label={t("filterIncome")}
                value={draft.incomeRange ?? ""}
                onChange={(incomeRange) =>
                  onDraftChange(setField(draft, "incomeRange", incomeRange))
                }
                options={dropdowns.income_range ?? []}
                placeholder={tc("select")}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
              {t("filterSections.physical")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FilterNumber
                label={t("filterAgeMin")}
                value={draft.ageMin ?? ""}
                onChange={(ageMin) => onDraftChange(setField(draft, "ageMin", ageMin))}
                min={18}
                max={80}
              />
              <FilterNumber
                label={t("filterAgeMax")}
                value={draft.ageMax ?? ""}
                onChange={(ageMax) => onDraftChange(setField(draft, "ageMax", ageMax))}
                min={18}
                max={80}
              />
              <FilterHeight
                label={t("filterHeightMin")}
                feetLabel={t("heightFeet")}
                inchesLabel={t("heightInches")}
                selectLabel={tc("select")}
                valueCm={draft.heightMinCm ?? ""}
                onChangeCm={(heightMinCm) =>
                  onDraftChange(setField(draft, "heightMinCm", heightMinCm))
                }
              />
              <FilterHeight
                label={t("filterHeightMax")}
                feetLabel={t("heightFeet")}
                inchesLabel={t("heightInches")}
                selectLabel={tc("select")}
                valueCm={draft.heightMaxCm ?? ""}
                onChangeCm={(heightMaxCm) =>
                  onDraftChange(setField(draft, "heightMaxCm", heightMaxCm))
                }
              />
              <FilterNumber
                label={t("filterWeightMin")}
                value={draft.weightMinKg ?? ""}
                onChange={(weightMinKg) =>
                  onDraftChange(setField(draft, "weightMinKg", weightMinKg))
                }
                min={30}
                max={200}
              />
              <FilterNumber
                label={t("filterWeightMax")}
                value={draft.weightMaxKg ?? ""}
                onChange={(weightMaxKg) =>
                  onDraftChange(setField(draft, "weightMaxKg", weightMaxKg))
                }
                min={30}
                max={200}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
              {t("filterSections.family")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FilterSelect
                label={t("filterFamilyType")}
                value={draft.familyType ?? ""}
                onChange={(familyType) =>
                  onDraftChange(setField(draft, "familyType", familyType))
                }
                options={dropdowns.family_type ?? []}
                placeholder={tc("select")}
              />
              <FilterSelect
                label={t("filterFamilyStatus")}
                value={draft.familyStatus ?? ""}
                onChange={(familyStatus) =>
                  onDraftChange(setField(draft, "familyStatus", familyStatus))
                }
                options={dropdowns.family_status ?? []}
                placeholder={tc("select")}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onApply}
              className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
            >
              {t("applyFilters")}
              {draftCount > 0 ? ` (${draftCount})` : ""}
            </button>
            <p className="text-xs text-zinc-500">{t("compatibilityHint")}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
