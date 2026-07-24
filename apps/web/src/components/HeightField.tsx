"use client";

import { FieldLabel } from "@/components/FieldLabel";
import {
  getFeetOptions,
  getInchesOptions,
} from "@easymatch/shared";

type HeightFieldProps = {
  label: string;
  feetLabel: string;
  inchesLabel: string;
  selectLabel: string;
  feet: string;
  inches: string;
  onFeetChange: (feet: string) => void;
  onInchesChange: (inches: string) => void;
  required?: boolean;
};

export function HeightField({
  label,
  feetLabel,
  inchesLabel,
  selectLabel,
  feet,
  inches,
  onFeetChange,
  onInchesChange,
  required,
}: HeightFieldProps) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-zinc-600">{feetLabel}</span>
          <select
            value={feet}
            onChange={(e) => onFeetChange(e.target.value)}
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
          <span className="text-xs font-semibold text-zinc-600">{inchesLabel}</span>
          <select
            value={inches}
            onChange={(e) => onInchesChange(e.target.value)}
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

type HeightRangeFieldProps = {
  minLabel: string;
  maxLabel: string;
  feetLabel: string;
  inchesLabel: string;
  selectLabel: string;
  minFeet: string;
  minInches: string;
  maxFeet: string;
  maxInches: string;
  onMinFeetChange: (v: string) => void;
  onMinInchesChange: (v: string) => void;
  onMaxFeetChange: (v: string) => void;
  onMaxInchesChange: (v: string) => void;
};

export function HeightRangeField(props: HeightRangeFieldProps) {
  return (
    <div className="sm:col-span-2 space-y-4">
      <HeightField
        label={props.minLabel}
        feetLabel={props.feetLabel}
        inchesLabel={props.inchesLabel}
        selectLabel={props.selectLabel}
        feet={props.minFeet}
        inches={props.minInches}
        onFeetChange={props.onMinFeetChange}
        onInchesChange={props.onMinInchesChange}
      />
      <HeightField
        label={props.maxLabel}
        feetLabel={props.feetLabel}
        inchesLabel={props.inchesLabel}
        selectLabel={props.selectLabel}
        feet={props.maxFeet}
        inches={props.maxInches}
        onFeetChange={props.onMaxFeetChange}
        onInchesChange={props.onMaxInchesChange}
      />
    </div>
  );
}
