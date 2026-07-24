import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  FormSectionTitle,
  FormSelectField,
  FormTextField,
  FormHeightFilterField,
} from "../form/FormFields";
import { tDiscoveryList } from "../../i18n/messages";
import { filterDistrictsForDivision } from "../../lib/profile-form";
import {
  countActiveFilters,
  setFilterField,
} from "../../lib/discovery-filters";
import type { AppLocale } from "../../lib/locale";
import type { DiscoveryFilters } from "../../types/discovery-filters";
import type { DropdownMap } from "../../types/dropdowns";
import { colors } from "../../theme/colors";

type Copy = ReturnType<typeof tDiscoveryList>;

type Props = {
  visible: boolean;
  draft: DiscoveryFilters;
  dropdowns: DropdownMap;
  locale: AppLocale;
  onClose: () => void;
  onDraftChange: (next: DiscoveryFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onUseMyPreferences: () => void;
};

function options(dropdowns: DropdownMap, key: string) {
  return (dropdowns[key] ?? []).map((item) => ({ value: item.value, label: item.label }));
}

export function DiscoveryFiltersModal({
  visible,
  draft,
  dropdowns,
  locale,
  onClose,
  onDraftChange,
  onApply,
  onClear,
  onUseMyPreferences,
}: Props) {
  const copy = tDiscoveryList(locale);
  const draftCount = countActiveFilters(draft);

  const patch = (partial: DiscoveryFilters) => onDraftChange({ ...draft, ...partial });
  const setField = (key: keyof DiscoveryFilters, value: string) =>
    onDraftChange(setFilterField(draft, key, value));

  const districtOptions = filterDistrictsForDivision(
    dropdowns.district ?? [],
    draft.division ?? "",
  ).map((item) => ({ value: item.value, label: item.label }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>{copy.close}</Text>
          </Pressable>
          <Text style={styles.title}>{copy.filtersTitle}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.quickActions}>
            <Pressable style={styles.secondaryBtn} onPress={onUseMyPreferences}>
              <Text style={styles.secondaryBtnText}>{copy.useMyPreferences}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={onClear}>
              <Text style={styles.secondaryBtnText}>{copy.clearFilters}</Text>
            </Pressable>
          </View>

          <FormSectionTitle title={copy.filterSectionSearch} />
          <FormTextField
            label={copy.filterProfileCode}
            value={draft.profileCode ?? ""}
            onChange={(value) => setField("profileCode", value)}
            placeholder={copy.profileCodePlaceholder}
            keyboardType="number-pad"
          />

          <FormSectionTitle title={copy.filterSectionBasic} />
          <FormSelectField
            label={copy.filterMaritalStatus}
            value={draft.maritalStatus ?? ""}
            onChange={(value) => setField("maritalStatus", value)}
            options={options(dropdowns, "marital_status")}
            placeholder={copy.select}
          />
          <FormSelectField
            label={copy.filterReligion}
            value={draft.religion ?? ""}
            onChange={(value) => setField("religion", value)}
            options={options(dropdowns, "religion")}
            placeholder={copy.select}
          />
          <FormSelectField
            label={copy.filterComplexion}
            value={draft.complexion ?? ""}
            onChange={(value) => setField("complexion", value)}
            options={options(dropdowns, "complexion")}
            placeholder={copy.select}
          />
          <FormSelectField
            label={copy.filterDisability}
            value={draft.hasDisability ?? ""}
            onChange={(value) => setField("hasDisability", value)}
            options={[
              { value: "false", label: copy.filterDisabilityNo },
              { value: "true", label: copy.filterDisabilityYes },
            ]}
            placeholder={copy.select}
          />

          <FormSectionTitle title={copy.filterSectionLocation} />
          <FormSelectField
            label={copy.filterDivision}
            value={draft.division ?? ""}
            onChange={(value) =>
              patch({
                division: value || undefined,
                district: undefined,
              })
            }
            options={options(dropdowns, "division")}
            placeholder={copy.select}
          />
          <FormSelectField
            label={copy.filterDistrict}
            value={draft.district ?? ""}
            onChange={(value) => setField("district", value)}
            options={districtOptions}
            placeholder={copy.select}
            disabled={!draft.division}
          />

          <FormSectionTitle title={copy.filterSectionEducationCareer} />
          <FormSelectField
            label={copy.filterEducation}
            value={draft.education ?? ""}
            onChange={(value) => setField("education", value)}
            options={options(dropdowns, "education")}
            placeholder={copy.select}
          />
          <FormSelectField
            label={copy.filterOccupation}
            value={draft.occupation ?? ""}
            onChange={(value) => setField("occupation", value)}
            options={options(dropdowns, "occupation")}
            placeholder={copy.select}
          />
          <FormSelectField
            label={copy.filterIncome}
            value={draft.incomeRange ?? ""}
            onChange={(value) => setField("incomeRange", value)}
            options={options(dropdowns, "income_range")}
            placeholder={copy.select}
          />

          <FormSectionTitle title={copy.filterSectionPhysical} />
          <FormTextField
            label={copy.filterAgeMin}
            value={draft.ageMin ?? ""}
            onChange={(value) => setField("ageMin", value)}
            keyboardType="number-pad"
          />
          <FormTextField
            label={copy.filterAgeMax}
            value={draft.ageMax ?? ""}
            onChange={(value) => setField("ageMax", value)}
            keyboardType="number-pad"
          />
          <FormHeightFilterField
            label={copy.filterHeightMin}
            feetLabel={copy.heightFeet}
            inchesLabel={copy.heightInches}
            selectLabel={copy.select}
            valueCm={draft.heightMinCm}
            onChangeCm={(value) => setField("heightMinCm", value)}
          />
          <FormHeightFilterField
            label={copy.filterHeightMax}
            feetLabel={copy.heightFeet}
            inchesLabel={copy.heightInches}
            selectLabel={copy.select}
            valueCm={draft.heightMaxCm}
            onChangeCm={(value) => setField("heightMaxCm", value)}
          />
          <FormTextField
            label={copy.filterWeightMin}
            value={draft.weightMinKg ?? ""}
            onChange={(value) => setField("weightMinKg", value)}
            keyboardType="number-pad"
          />
          <FormTextField
            label={copy.filterWeightMax}
            value={draft.weightMaxKg ?? ""}
            onChange={(value) => setField("weightMaxKg", value)}
            keyboardType="number-pad"
          />

          <FormSectionTitle title={copy.filterSectionFamily} />
          <FormSelectField
            label={copy.filterFamilyType}
            value={draft.familyType ?? ""}
            onChange={(value) => setField("familyType", value)}
            options={options(dropdowns, "family_type")}
            placeholder={copy.select}
          />
          <FormSelectField
            label={copy.filterFamilyStatus}
            value={draft.familyStatus ?? ""}
            onChange={(value) => setField("familyStatus", value)}
            options={options(dropdowns, "family_status")}
            placeholder={copy.select}
          />

          <Text style={styles.hint}>{copy.compatibilityHint}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.applyBtn} onPress={onApply}>
            <Text style={styles.applyText}>
              {copy.applyFilters}
              {draftCount > 0 ? ` (${draftCount})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.rose900,
  },
  closeText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
    minWidth: 48,
  },
  title: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  headerSpacer: {
    minWidth: 48,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  secondaryBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.rose800,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.zinc500,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.rose100,
    backgroundColor: colors.white,
  },
  applyBtn: {
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});

function filterLabelMap(copy: Copy): Record<string, string> {
  return {
    profileCode: copy.filterProfileCode,
    gender: copy.filterGender,
    division: copy.filterDivision,
    district: copy.filterDistrict,
    maritalStatus: copy.filterMaritalStatus,
    religion: copy.filterReligion,
    complexion: copy.filterComplexion,
    education: copy.filterEducation,
    occupation: copy.filterOccupation,
    incomeRange: copy.filterIncome,
    ageMin: copy.filterAgeMin,
    ageMax: copy.filterAgeMax,
    heightMinCm: copy.filterHeightMin,
    heightMaxCm: copy.filterHeightMax,
    weightMinKg: copy.filterWeightMin,
    weightMaxKg: copy.filterWeightMax,
    hasDisability: copy.filterDisability,
    familyType: copy.filterFamilyType,
    familyStatus: copy.filterFamilyStatus,
    filterDisabilityYes: copy.filterDisabilityYes,
    filterDisabilityNo: copy.filterDisabilityNo,
  };
}

export function discoveryFilterLabels(copy: Copy) {
  return filterLabelMap(copy);
}
