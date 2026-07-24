import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  cmToFeetInches,
  feetInchesToCm,
  formatDisplayDateInput,
  DISPLAY_DATE_MAX_LENGTH,
  getFeetOptions,
  getInchesOptions,
} from "@easymatch/shared";
import { colors } from "../../theme/colors";

type Option = { value: string; label: string };

export function FormTextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  multiline,
  keyboardType = "default",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "number-pad";
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, disabled && styles.inputDisabled]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.zinc500}
        editable={!disabled}
        multiline={multiline}
        keyboardType={keyboardType}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function FormDateOfBirthField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        value={value}
        onChangeText={(text) => onChange(formatDisplayDateInput(text))}
        placeholder={placeholder}
        placeholderTextColor={colors.zinc500}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={DISPLAY_DATE_MAX_LENGTH}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function FormSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  required,
  disabled,
  allowCustom,
  otherLabel = "Other",
  customPlaceholder = "Enter custom value",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowCustom?: boolean;
  otherLabel?: string;
  customPlaceholder?: string;
}) {
  const hasOtherOption = options.some((option) => option.value === "other");
  const isCustomText = Boolean(value) && !options.some((option) => option.value === value);
  const [customMode, setCustomMode] = useState(
    () => isCustomText || value === "other",
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isCustomText || value === "other") {
      setCustomMode(true);
    } else if (value && options.some((option) => option.value === value)) {
      setCustomMode(false);
    }
  }, [value, options, isCustomText]);

  const showCustomInput = Boolean(allowCustom) && (customMode || isCustomText);
  const selected = options.find((option) => option.value === value);
  const displayLabel = isCustomText ? value : selected?.label;

  function pickOption(next: string) {
    if (next === "__custom__" || next === "other") {
      setCustomMode(true);
      onChange("");
    } else {
      setCustomMode(false);
      onChange(next);
    }
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable
        style={[styles.selectTrigger, disabled && styles.inputDisabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text style={[styles.selectText, !displayLabel && styles.selectPlaceholder]}>
          {displayLabel ?? placeholder}
        </Text>
      </Pressable>

      {showCustomInput ? (
        <TextInput
          style={[styles.input, styles.customInput]}
          value={isCustomText ? value : ""}
          onChangeText={(next) => {
            setCustomMode(true);
            onChange(next);
          }}
          placeholder={customPlaceholder}
          placeholderTextColor={colors.zinc500}
          editable={!disabled}
        />
      ) : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={[
                ...options,
                ...(allowCustom && !hasOtherOption
                  ? [{ value: "__custom__", label: otherLabel }]
                  : []),
              ]}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.optionRow,
                    (item.value === value ||
                      (item.value === "__custom__" && showCustomInput)) &&
                      styles.optionRowActive,
                  ]}
                  onPress={() => pickOption(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      (item.value === value ||
                        (item.value === "__custom__" && showCustomInput)) &&
                        styles.optionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.modalClose} onPress={() => setOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function FormHeightField({
  label,
  feetLabel,
  inchesLabel,
  selectLabel,
  feet,
  inches,
  onFeetChange,
  onInchesChange,
}: {
  label: string;
  feetLabel: string;
  inchesLabel: string;
  selectLabel: string;
  feet: string;
  inches: string;
  onFeetChange: (value: string) => void;
  onInchesChange: (value: string) => void;
}) {
  const feetOptions = getFeetOptions().map((value) => ({
    value: String(value),
    label: `${value} ft`,
  }));
  const inchesOptions = getInchesOptions().map((value) => ({
    value: String(value),
    label: `${value} in`,
  }));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <FormSelectField
        label={feetLabel}
        value={feet}
        onChange={onFeetChange}
        options={feetOptions}
        placeholder={selectLabel}
      />
      <FormSelectField
        label={inchesLabel}
        value={inches}
        onChange={onInchesChange}
        options={inchesOptions}
        placeholder={selectLabel}
      />
    </View>
  );
}

export function FormHeightFilterField({
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
  valueCm?: string;
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
    <FormHeightField
      label={label}
      feetLabel={feetLabel}
      inchesLabel={inchesLabel}
      selectLabel={selectLabel}
      feet={feet}
      inches={inches}
      onFeetChange={(nextFeet) => update(nextFeet, inches)}
      onInchesChange={(nextInches) => update(feet, nextInches)}
    />
  );
}

export function FormSectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc800,
    marginBottom: 6,
  },
  required: { color: colors.red600 },
  input: {
    borderWidth: 1,
    borderColor: colors.rose100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.zinc900,
    backgroundColor: colors.white,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  inputDisabled: {
    backgroundColor: colors.zinc100,
    opacity: 0.8,
  },
  customInput: {
    marginTop: 8,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: colors.zinc500,
  },
  selectTrigger: {
    borderWidth: 1,
    borderColor: colors.rose100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: colors.white,
  },
  selectText: {
    fontSize: 15,
    color: colors.zinc900,
  },
  selectPlaceholder: {
    color: colors.zinc500,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "70%",
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  optionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc100,
  },
  optionRowActive: {
    backgroundColor: colors.rose50,
  },
  optionText: {
    fontSize: 15,
    color: colors.zinc900,
  },
  optionTextActive: {
    color: colors.rose800,
    fontWeight: "700",
  },
  modalClose: {
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCloseText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "800",
    color: colors.zinc900,
  },
});
