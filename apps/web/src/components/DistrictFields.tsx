"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  districtLabel,
  districtsForDivision,
  type DistrictDropdownItem,
} from "@/lib/districts";
import {
  upazilasForDistrict,
  type UpazilaDropdownItem,
} from "@/lib/upazilas";

import { FieldLabel } from "@/components/FieldLabel";

export function DistrictSelectField({
  label,
  division,
  value,
  onChange,
  districts,
  required,
}: {
  label: string;
  division: string;
  value: string;
  onChange: (value: string) => void;
  districts: DistrictDropdownItem[];
  required?: boolean;
}) {
  const tc = useTranslations("common");
  const options = districtsForDivision(districts, division);
  const isKnown = !value || options.some((option) => option.value === value);

  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        value={isKnown ? value : ""}
        disabled={!division}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="field-input disabled:cursor-not-allowed disabled:bg-zinc-100"
      >
        <option value="">{division ? tc("select") : "—"}</option>
        {!isKnown && value ? <option value="">{value}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function UpazilaSelectField({
  label,
  district,
  value,
  onChange,
  upazilas,
}: {
  label: string;
  district: string;
  value: string;
  onChange: (value: string) => void;
  upazilas: UpazilaDropdownItem[];
}) {
  const tc = useTranslations("common");
  const options = upazilasForDistrict(upazilas, district);
  const isKnown = !value || options.some((option) => option.value === value);

  return (
    <label className="block space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={isKnown ? value : ""}
        disabled={!district}
        onChange={(e) => onChange(e.target.value)}
        className="field-input disabled:cursor-not-allowed disabled:bg-zinc-100"
      >
        <option value="">{district ? tc("select") : "—"}</option>
        {!isKnown && value ? <option value="">{value}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DistrictMultiSelectField({
  label,
  hint,
  filterLabel,
  allDivisionsLabel,
  selected,
  onChange,
  districts,
  divisions,
}: {
  label: string;
  hint: string;
  filterLabel: string;
  allDivisionsLabel: string;
  selected: string[];
  onChange: (values: string[]) => void;
  districts: DistrictDropdownItem[];
  divisions: { value: string; label: string }[];
}) {
  const tc = useTranslations("common");
  const tp = useTranslations("profile.fields");
  const [filterDivision, setFilterDivision] = useState("");

  const grouped = useMemo(() => {
    const divisionMap = new Map(
      divisions.map((division) => [division.value, division.label]),
    );
    const buckets = new Map<string, DistrictDropdownItem[]>();

    const source = filterDivision
      ? districtsForDivision(districts, filterDivision)
      : districts;

    for (const district of source) {
      const key = district.parentValue ?? "other";
      const list = buckets.get(key) ?? [];
      list.push(district);
      buckets.set(key, list);
    }

    return [...buckets.entries()]
      .map(([divisionValue, items]) => ({
        divisionValue,
        divisionLabel: divisionMap.get(divisionValue) ?? divisionValue,
        items,
      }))
      .sort((a, b) => a.divisionLabel.localeCompare(b.divisionLabel));
  }, [districts, divisions, filterDivision]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function remove(value: string) {
    onChange(selected.filter((item) => item !== value));
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <span className="field-label">{label}</span>
        <p className="mt-1 text-xs text-zinc-600">{hint}</p>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => remove(value)}
              className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-900 hover:bg-rose-200"
            >
              {districtLabel(districts, value)}
              <span aria-hidden>×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-semibold text-zinc-600 underline hover:text-rose-800"
          >
            {tp("clearDistricts")}
          </button>
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-zinc-600">{filterLabel}</span>
        <select
          value={filterDivision}
          onChange={(e) => setFilterDivision(e.target.value)}
          className="field-input"
        >
          <option value="">{allDivisionsLabel}</option>
          {divisions.map((division) => (
            <option key={division.value} value={division.value}>
              {division.label}
            </option>
          ))}
        </select>
      </label>

      <div className="max-h-64 space-y-4 overflow-y-auto rounded-lg border border-zinc-300 bg-zinc-50 p-3">
        {districts.length === 0 ? (
          <p className="text-sm text-zinc-500">{tc("loading")}</p>
        ) : (
          grouped.map((group) => (
            <div key={group.divisionValue}>
              {!filterDivision ? (
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  {group.divisionLabel}
                </p>
              ) : null}
              <div className="space-y-2">
                {group.items.map((district) => (
                  <label
                    key={district.value}
                    className="flex items-center gap-2 text-sm text-zinc-900"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(district.value)}
                      onChange={() => toggle(district.value)}
                      className="h-4 w-4 accent-rose-700"
                    />
                    {district.label}
                  </label>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-zinc-600">
        {tp("districtsSelected", { count: selected.length })}
      </p>
    </div>
  );
}
