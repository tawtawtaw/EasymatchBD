import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../../theme/colors";

type Option = { value: string; label: string; parentValue?: string | null };

function optionLabel(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function FormMultiSelectField({
  label,
  hint,
  selected,
  onChange,
  options,
  allowCustom,
  customLabel,
  addCustomLabel,
  customPlaceholder,
  clearLabel,
  selectedCountLabel,
}: {
  label: string;
  hint?: string;
  selected: string[];
  onChange: (values: string[]) => void;
  options: Option[];
  allowCustom?: boolean;
  customLabel?: string;
  addCustomLabel?: string;
  customPlaceholder?: string;
  clearLabel?: string;
  selectedCountLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
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
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {selected.length > 0 ? (
        <View style={styles.chips}>
          {selected.map((value) => (
            <Pressable
              key={value}
              style={styles.chip}
              onPress={() => onChange(selected.filter((item) => item !== value))}
            >
              <Text style={styles.chipText}>{optionLabel(options, value)}</Text>
              <Text style={styles.chipRemove}>×</Text>
            </Pressable>
          ))}
          {clearLabel ? (
            <Pressable onPress={() => onChange([])}>
              <Text style={styles.clearLink}>{clearLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>
          {selectedCountLabel ?? `${selected.length} selected`}
        </Text>
      </Pressable>

      {allowCustom ? (
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customValue}
            onChangeText={setCustomValue}
            placeholder={customPlaceholder}
            placeholderTextColor={colors.zinc500}
          />
          <Pressable
            style={[styles.addBtn, !customValue.trim() && styles.addBtnDisabled]}
            onPress={addCustom}
            disabled={!customValue.trim()}
          >
            <Text style={styles.addBtnText}>{addCustomLabel ?? "Add"}</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.optionList}>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.optionRow}
                  onPress={() => toggle(option.value)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selected.includes(option.value) && styles.checkboxChecked,
                    ]}
                  >
                    {selected.includes(option.value) ? (
                      <Text style={styles.checkboxTick}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.optionText}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function FormDistrictMultiSelectField({
  label,
  hint,
  filterLabel,
  allDivisionsLabel,
  clearLabel,
  selectedCountLabel,
  selected,
  onChange,
  districts,
  divisions,
  placeholder,
}: {
  label: string;
  hint?: string;
  filterLabel: string;
  allDivisionsLabel: string;
  clearLabel: string;
  selectedCountLabel: (count: number) => string;
  selected: string[];
  onChange: (values: string[]) => void;
  districts: Option[];
  divisions: Option[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [filterDivision, setFilterDivision] = useState("");

  const grouped = useMemo(() => {
    const divisionMap = new Map(divisions.map((division) => [division.value, division.label]));
    const buckets = new Map<string, Option[]>();
    const source = filterDivision
      ? districts.filter((district) => district.parentValue === filterDivision)
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

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {selected.length > 0 ? (
        <View style={styles.chips}>
          {selected.map((value) => (
            <Pressable
              key={value}
              style={styles.chip}
              onPress={() => onChange(selected.filter((item) => item !== value))}
            >
              <Text style={styles.chipText}>{optionLabel(districts, value)}</Text>
              <Text style={styles.chipRemove}>×</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => onChange([])}>
            <Text style={styles.clearLink}>{clearLabel}</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>
          {selected.length > 0
            ? selectedCountLabel(selected.length)
            : placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            <Text style={styles.filterLabel}>{filterLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <Pressable
                style={[styles.filterChip, !filterDivision && styles.filterChipActive]}
                onPress={() => setFilterDivision("")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !filterDivision && styles.filterChipTextActive,
                  ]}
                >
                  {allDivisionsLabel}
                </Text>
              </Pressable>
              {divisions.map((division) => (
                <Pressable
                  key={division.value}
                  style={[
                    styles.filterChip,
                    filterDivision === division.value && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterDivision(division.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterDivision === division.value && styles.filterChipTextActive,
                    ]}
                  >
                    {division.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView style={styles.optionList}>
              {grouped.map((group) => (
                <View key={group.divisionValue}>
                  {!filterDivision ? (
                    <Text style={styles.groupTitle}>{group.divisionLabel}</Text>
                  ) : null}
                  {group.items.map((district) => (
                    <Pressable
                      key={district.value}
                      style={styles.optionRow}
                      onPress={() => toggle(district.value)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          selected.includes(district.value) && styles.checkboxChecked,
                        ]}
                      >
                        {selected.includes(district.value) ? (
                          <Text style={styles.checkboxTick}>✓</Text>
                        ) : null}
                      </View>
                      <Text style={styles.optionText}>{district.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc800,
    marginBottom: 6,
  },
  hint: {
    marginBottom: 8,
    fontSize: 12,
    color: colors.zinc500,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: colors.rose100,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.rose900 },
  chipRemove: { fontSize: 14, color: colors.rose800, fontWeight: "700" },
  clearLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.zinc600,
    textDecorationLine: "underline",
    alignSelf: "center",
  },
  trigger: {
    borderWidth: 1,
    borderColor: colors.rose100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: colors.white,
  },
  triggerText: { fontSize: 15, color: colors.zinc700 },
  customRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.rose100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.zinc900,
    backgroundColor: colors.white,
  },
  addBtn: {
    borderRadius: 12,
    backgroundColor: colors.rose800,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "80%",
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
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc600,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
    maxHeight: 44,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.zinc100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.rose800,
    borderColor: colors.rose800,
  },
  filterChipText: { fontSize: 12, color: colors.zinc700, fontWeight: "600" },
  filterChipTextActive: { color: colors.white },
  optionList: { maxHeight: 360 },
  groupTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.zinc500,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc100,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.zinc500,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.rose800,
    borderColor: colors.rose800,
  },
  checkboxTick: { color: colors.white, fontSize: 13, fontWeight: "700" },
  optionText: { fontSize: 15, color: colors.zinc900, flex: 1 },
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
});
