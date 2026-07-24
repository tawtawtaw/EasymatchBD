"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DistrictSelectField, UpazilaSelectField } from "@/components/DistrictFields";
import { FieldLabel } from "@/components/FieldLabel";
import {
  addressCountryOptions,
  isBangladeshAddress,
  normalizeCountry,
  type MemberAddressValues,
} from "@/lib/member-address";

type Option = { value: string; label: string; parentValue?: string | null };

function CountrySelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
}) {
  const tc = useTranslations("common");
  const isCustom =
    Boolean(value) && !options.some((option) => option.value === value);
  const [customMode, setCustomMode] = useState(isCustom || value === "");

  useEffect(() => {
    if (isCustom) {
      setCustomMode(true);
    } else if (value && options.some((option) => option.value === value)) {
      setCustomMode(false);
    }
  }, [isCustom, options, value]);

  const selectValue = customMode ? "__custom__" : value;

  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        value={selectValue}
        required={required && !customMode}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "__custom__") {
            setCustomMode(true);
            onChange("");
            return;
          }
          setCustomMode(false);
          onChange(next);
        }}
        className="field-input"
      >
        <option value="">{tc("select")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value="__custom__">{tc("other")}</option>
      </select>
      {customMode ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={tc("customValue")}
          className="field-input mt-1"
          required={required}
        />
      ) : null}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="field-input"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
}) {
  const tc = useTranslations("common");

  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="field-input"
      >
        <option value="">{tc("select")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type MemberAddressFieldsProps = {
  address: MemberAddressValues;
  onChange: (address: MemberAddressValues) => void;
  divisions: Option[];
  districts: Option[];
  upazilas: Option[];
};

export function MemberAddressFields({
  address,
  onChange,
  divisions,
  districts,
  upazilas,
}: MemberAddressFieldsProps) {
  const locale = useLocale();
  const tf = useTranslations("profile.fields");
  const countryOptions = useMemo(
    () => addressCountryOptions(locale),
    [locale],
  );
  const isBangladesh = isBangladeshAddress(address.country);

  function handleCountryChange(nextCountry: string) {
    const normalized = normalizeCountry(nextCountry);
    const wasBangladesh = isBangladeshAddress(address.country);

    if (isBangladeshAddress(normalized)) {
      onChange({
        ...address,
        country: normalized,
        division: wasBangladesh ? address.division : "",
        district: wasBangladesh ? address.district : "",
        upazila: wasBangladesh ? address.upazila : "",
      });
      return;
    }

    onChange({
      ...address,
      country: normalized,
      division: wasBangladesh ? "" : address.division,
      district: "",
      upazila: "",
    });
  }

  if (isBangladesh) {
    return (
      <>
        <CountrySelectField
          required
          label={tf("country")}
          value={address.country}
          onChange={handleCountryChange}
          options={countryOptions}
        />
        <SelectField
          required
          label={tf("division")}
          value={address.division}
          onChange={(division) =>
            onChange({
              ...address,
              division,
              district:
                address.district &&
                districts.some(
                  (district) =>
                    district.value === address.district &&
                    district.parentValue === division,
                )
                  ? address.district
                  : "",
              upazila: "",
            })
          }
          options={divisions}
        />
        <DistrictSelectField
          required
          label={tf("district")}
          division={address.division}
          value={address.district}
          onChange={(district) =>
            onChange({
              ...address,
              district,
              upazila:
                address.upazila &&
                upazilas.some(
                  (upazila) =>
                    upazila.value === address.upazila &&
                    upazila.parentValue === district,
                )
                  ? address.upazila
                  : "",
            })
          }
          districts={districts}
        />
        <UpazilaSelectField
          label={tf("upazila")}
          district={address.district}
          value={address.upazila}
          onChange={(upazila) => onChange({ ...address, upazila })}
          upazilas={upazilas}
        />
        <TextField
          label={tf("cityTown")}
          value={address.cityTown}
          onChange={(cityTown) => onChange({ ...address, cityTown })}
        />
        <div className="sm:col-span-2">
          <TextField
            label={tf("addressLine")}
            value={address.addressLine}
            onChange={(addressLine) => onChange({ ...address, addressLine })}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <CountrySelectField
        required
        label={tf("country")}
        value={address.country}
        onChange={handleCountryChange}
        options={countryOptions}
      />
      <TextField
        required
        label={tf("cityTown")}
        value={address.cityTown}
        onChange={(cityTown) => onChange({ ...address, cityTown })}
      />
      <TextField
        label={tf("stateProvince")}
        value={address.division}
        onChange={(division) => onChange({ ...address, division })}
      />
      <div className="sm:col-span-2">
        <TextField
          required
          label={tf("addressLine")}
          value={address.addressLine}
          onChange={(addressLine) => onChange({ ...address, addressLine })}
        />
      </div>
    </>
  );
}
