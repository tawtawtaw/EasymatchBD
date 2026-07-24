"use client";

import { useTranslations } from "next-intl";
import { getWeightInputError } from "@/lib/weight";

type WeightFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function WeightField({ label, value, onChange }: WeightFieldProps) {
  const te = useTranslations("profile.errors");
  const error = getWeightInputError(value, {
    invalid: te("invalidWeight"),
    range: te("weightRange"),
  });

  return (
    <label className="block space-y-1.5">
      <span className="field-label">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`field-input ${error ? "border-red-500 ring-1 ring-red-200" : ""}`}
        aria-invalid={error ? true : undefined}
      />
      {error && (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}
