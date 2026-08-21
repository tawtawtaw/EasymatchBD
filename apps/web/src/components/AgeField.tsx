"use client";

import { useTranslations } from "next-intl";
import { FieldLabel } from "@/components/FieldLabel";
import { getAgeInputError } from "@/lib/age";
import { LEGAL_MARRIAGE_AGE_FEMALE, PROFILE_AGE_MAX } from "@easymatch/shared";

type AgeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minAge?: number;
  maxAge?: number;
};

export function AgeField({
  label,
  value,
  onChange,
  required,
  minAge = LEGAL_MARRIAGE_AGE_FEMALE,
  maxAge = PROFILE_AGE_MAX,
}: AgeFieldProps) {
  const te = useTranslations("profile.errors");
  const error = getAgeInputError(
    value,
    {
      invalid: te("invalidAge"),
      range: te("ageRange", { min: minAge, max: maxAge }),
    },
    { min: minAge, max: maxAge },
  );

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
