"use client";

import { useTranslations } from "next-intl";
import { FieldLabel } from "@/components/FieldLabel";
import { getAgeInputError } from "@/lib/age";

type AgeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function AgeField({ label, value, onChange, required }: AgeFieldProps) {
  const te = useTranslations("profile.errors");
  const error = getAgeInputError(value, {
    invalid: te("invalidAge"),
    range: te("ageRange"),
  });

  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        required={required}
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
