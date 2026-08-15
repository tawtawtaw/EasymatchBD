import { isBangladeshAddress } from "@easymatch/shared";
import { View, Pressable, Text, StyleSheet } from "react-native";
import type { DropdownOption } from "../../types/dropdowns";
import { filterDistrictsForDivision, filterUpazilasForDistrict } from "../../lib/profile-form";
import { FormSelectField, FormTextField } from "./FormFields";
import { colors } from "../../theme/colors";

export type AddressValues = {
  country: string;
  division: string;
  district: string;
  upazila: string;
  cityTown: string;
  addressLine: string;
};

type Props = {
  labels: {
    country: string;
    division: string;
    district: string;
    upazila: string;
    cityTown: string;
    addressLine: string;
    select: string;
  };
  divisions: DropdownOption[];
  districts: DropdownOption[];
  upazilas: DropdownOption[];
  countries: { value: string; label: string }[];
  value: AddressValues;
  onChange: (value: AddressValues) => void;
};

export function AddressFields({
  labels,
  divisions,
  districts,
  upazilas,
  countries,
  value,
  onChange,
}: Props) {
  const isBd = isBangladeshAddress(value.country);
  const filteredDistricts = filterDistrictsForDivision(districts, value.division);
  const filteredUpazilas = filterUpazilasForDistrict(upazilas, value.district);

  function patch(partial: Partial<AddressValues>) {
    onChange({ ...value, ...partial });
  }

  return (
    <View>
      <FormSelectField
        label={labels.country}
        value={value.country}
        onChange={(country) =>
          patch({
            country,
            division: "",
            district: "",
            upazila: "",
            cityTown: "",
          })
        }
        options={countries}
        placeholder={labels.select}
        required
      />

      {isBd ? (
        <>
          <FormSelectField
            label={labels.division}
            value={value.division}
            onChange={(division) => patch({ division, district: "", upazila: "" })}
            options={divisions}
            placeholder={labels.select}
            required
          />
          <FormSelectField
            label={labels.district}
            value={value.district}
            onChange={(district) =>
              patch({
                district,
                upazila:
                  value.upazila &&
                  upazilas.some(
                    (upazila) =>
                      upazila.value === value.upazila &&
                      upazila.parentValue === district,
                  )
                    ? value.upazila
                    : "",
              })
            }
            options={filteredDistricts}
            placeholder={labels.select}
            required
          />
          <FormSelectField
            label={labels.upazila}
            value={value.upazila}
            onChange={(upazila) => patch({ upazila })}
            options={filteredUpazilas}
            placeholder={labels.select}
          />
        </>
      ) : (
        <>
          <FormTextField
            label={labels.cityTown}
            value={value.cityTown}
            onChange={(cityTown) => patch({ cityTown })}
            required
          />
          <FormTextField
            label={labels.division}
            value={value.division}
            onChange={(division) => patch({ division })}
          />
        </>
      )}

      <FormTextField
        label={labels.addressLine}
        value={value.addressLine}
        onChange={(addressLine) => patch({ addressLine })}
        multiline
        required={!isBd}
      />
    </View>
  );
}

export function FormCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Pressable style={checkboxStyles.row} onPress={() => onChange(!checked)}>
      <View style={[checkboxStyles.box, checked && checkboxStyles.boxChecked]}>
        {checked ? <Text style={checkboxStyles.tick}>✓</Text> : null}
      </View>
      <Text style={checkboxStyles.label}>{label}</Text>
    </Pressable>
  );
}

const checkboxStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.rose800,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  boxChecked: {
    backgroundColor: colors.rose800,
  },
  tick: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: colors.zinc800,
  },
});
