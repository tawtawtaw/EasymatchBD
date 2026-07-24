"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FieldLabel } from "@/components/FieldLabel";

type DropdownOption = { value: string; label: string };

function optionLabel(options: DropdownOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function DropdownMultiSelectField({
  label,
  hint,
  selected,
  onChange,
  options,
  allowCustom,
  clearLabel,
  selectedCountLabel,
}: {
  label: string;
  hint?: string;
  selected: string[];
  onChange: (values: string[]) => void;
  options: DropdownOption[];
  allowCustom?: boolean;
  clearLabel?: string;
  selectedCountLabel?: (count: number) => string;
}) {
  const tc = useTranslations("common");
  const tp = useTranslations("profile.fields");
  const [customValue, setCustomValue] = useState("");

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

  function addCustom() {
    const trimmed = customValue.trim();
    if (!trimmed || selected.includes(trimmed)) {
      setCustomValue("");
      return;
    }
    onChange([...selected, trimmed]);
    setCustomValue("");
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <FieldLabel>{label}</FieldLabel>
        {hint ? <p className="mt-1 text-xs text-zinc-600">{hint}</p> : null}
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
              {optionLabel(options, value)}
              <span aria-hidden>×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-semibold text-zinc-600 underline hover:text-rose-800"
          >
            {clearLabel ?? tp("clearProfessions")}
          </button>
        </div>
      ) : null}

      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-zinc-300 bg-zinc-50 p-3">
        {options.length === 0 ? (
          <p className="text-sm text-zinc-500">{tc("loading")}</p>
        ) : (
          options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm text-zinc-900"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="h-4 w-4 accent-rose-700"
              />
              {option.label}
            </label>
          ))
        )}
      </div>

      {allowCustom ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block flex-1 space-y-1.5">
            <span className="text-xs font-medium text-zinc-600">
              {tp("customProfession")}
            </span>
            <input
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder={tc("customValue")}
              className="field-input"
            />
          </label>
          <button
            type="button"
            onClick={addCustom}
            disabled={!customValue.trim()}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
          >
            {tp("addProfession")}
          </button>
        </div>
      ) : null}

      <p className="text-xs text-zinc-600">
        {(selectedCountLabel ?? ((count) => tp("professionsSelected", { count })))(
          selected.length,
        )}
      </p>
    </div>
  );
}
