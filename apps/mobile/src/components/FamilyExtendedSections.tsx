import {
  MATERNAL_RELATIVE_RELATIONS,
  PATERNAL_RELATIVE_RELATIONS,
} from "@easymatch/shared";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  FormSectionTitle,
  FormSelectField,
  FormTextField,
} from "./form/FormFields";
import { discoverySectionTitle, profileFieldLabel } from "../i18n/biodata-fields";
import type { AppLocale } from "../lib/locale";
import {
  emptyRelativeEntry,
  emptySiblingEntry,
  isSiblingMarried,
} from "../lib/family-form";
import type { tProfileFamily } from "../i18n/messages";
import type { DropdownMap } from "../types/dropdowns";
import type {
  FamilyFormState,
  RelativeFormEntry,
  SiblingFormEntry,
} from "../types/profile";
import { colors } from "../theme/colors";

type Copy = ReturnType<typeof tProfileFamily>;

type Option = { value: string; label: string };

function options(dropdowns: DropdownMap, key: string) {
  return (dropdowns[key] ?? []).map((item) => ({
    value: item.value,
    label: item.label,
  }));
}

function relativeRelationOptions(
  locale: AppLocale,
  side: "paternal" | "maternal",
): Option[] {
  const values =
    side === "paternal" ? PATERNAL_RELATIVE_RELATIONS : MATERNAL_RELATIVE_RELATIONS;
  const group =
    side === "paternal"
      ? "paternalRelativeRelationOptions"
      : "maternalRelativeRelationOptions";

  return values.map((value) => ({
    value,
    label: profileFieldLabel(locale, `${group}.${value}`),
  }));
}

function EntryCard({
  title,
  onRemove,
  removeLabel,
  children,
}: {
  title: string;
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryTitle}>{title}</Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={styles.removeText}>{removeLabel}</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

type Props = {
  form: FamilyFormState;
  dropdowns: DropdownMap;
  locale: AppLocale;
  copy: Copy;
  onChange: (next: FamilyFormState) => void;
};

export function FamilyExtendedSections({
  form,
  dropdowns,
  locale,
  copy,
  onChange,
}: Props) {
  const field = (key: string) => profileFieldLabel(locale, key);
  const selectPlaceholder = copy.select;
  const customSelectProps = {
    allowCustom: true as const,
    otherLabel: copy.other,
    customPlaceholder: copy.customValue,
  };

  function updateSibling(index: number, patch: Partial<SiblingFormEntry>) {
    onChange({
      ...form,
      siblings: form.siblings.map((entry, i) => {
        if (i !== index) return entry;
        const next = { ...entry, ...patch };
        if (
          patch.maritalStatus !== undefined &&
          !isSiblingMarried(patch.maritalStatus)
        ) {
          next.spouseName = "";
          next.spouseEducation = "";
          next.spouseProfession = "";
        }
        return next;
      }),
    });
  }

  function updateRelative(
    side: "paternalRelatives" | "maternalRelatives",
    index: number,
    patch: Partial<RelativeFormEntry>,
  ) {
    onChange({
      ...form,
      [side]: form[side].map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    });
  }

  return (
    <>
      <View style={styles.sectionHeader}>
        <FormSectionTitle title={copy.siblingsSection} />
        <Pressable
          style={styles.addButton}
          onPress={() =>
            onChange({
              ...form,
              siblings: [...form.siblings, emptySiblingEntry()],
            })
          }
        >
          <Text style={styles.addButtonText}>{copy.addSibling}</Text>
        </Pressable>
      </View>

      {form.siblings.map((entry, index) => (
        <EntryCard
          key={`sibling-${index}`}
          title={copy.entryLabel.replace("{number}", String(index + 1))}
          onRemove={() =>
            onChange({
              ...form,
              siblings: form.siblings.filter((_, i) => i !== index),
            })
          }
          removeLabel={copy.remove}
        >
          <FormSelectField
            label={field("relationship")}
            value={entry.relationship}
            onChange={(value) => updateSibling(index, { relationship: value })}
            options={options(dropdowns, "sibling_relationship")}
            placeholder={selectPlaceholder}
          />
          <FormTextField
            label={field("name")}
            value={entry.name}
            onChange={(value) => updateSibling(index, { name: value })}
          />
          <FormSelectField
            label={field("maritalStatus")}
            value={entry.maritalStatus}
            onChange={(value) => updateSibling(index, { maritalStatus: value })}
            options={options(dropdowns, "marital_status")}
            placeholder={selectPlaceholder}
          />
          <FormSelectField
            label={field("education")}
            value={entry.education}
            onChange={(value) => updateSibling(index, { education: value })}
            options={options(dropdowns, "education")}
            placeholder={selectPlaceholder}
            {...customSelectProps}
          />
          <FormSelectField
            label={field("profession")}
            value={entry.profession}
            onChange={(value) => updateSibling(index, { profession: value })}
            options={options(dropdowns, "occupation")}
            placeholder={selectPlaceholder}
            {...customSelectProps}
          />
          {isSiblingMarried(entry.maritalStatus) ? (
            <>
              <FormTextField
                label={field("spouseName")}
                value={entry.spouseName}
                onChange={(value) => updateSibling(index, { spouseName: value })}
              />
              <FormSelectField
                label={field("spouseEducation")}
                value={entry.spouseEducation}
                onChange={(value) => updateSibling(index, { spouseEducation: value })}
                options={options(dropdowns, "education")}
                placeholder={selectPlaceholder}
                {...customSelectProps}
              />
              <FormSelectField
                label={field("spouseProfession")}
                value={entry.spouseProfession}
                onChange={(value) => updateSibling(index, { spouseProfession: value })}
                options={options(dropdowns, "occupation")}
                placeholder={selectPlaceholder}
                {...customSelectProps}
              />
            </>
          ) : null}
        </EntryCard>
      ))}

      <View style={styles.sectionHeader}>
        <FormSectionTitle
          title={discoverySectionTitle(locale, "paternalRelatives")}
        />
        <Pressable
          style={styles.addButton}
          onPress={() =>
            onChange({
              ...form,
              paternalRelatives: [...form.paternalRelatives, emptyRelativeEntry()],
            })
          }
        >
          <Text style={styles.addButtonText}>{copy.addPaternalRelative}</Text>
        </Pressable>
      </View>

      {form.paternalRelatives.map((entry, index) => (
        <EntryCard
          key={`paternal-${index}`}
          title={copy.entryLabel.replace("{number}", String(index + 1))}
          onRemove={() =>
            onChange({
              ...form,
              paternalRelatives: form.paternalRelatives.filter((_, i) => i !== index),
            })
          }
          removeLabel={copy.remove}
        >
          <FormSelectField
            label={field("relation")}
            value={entry.relation}
            onChange={(value) =>
              updateRelative("paternalRelatives", index, { relation: value })
            }
            options={relativeRelationOptions(locale, "paternal")}
            placeholder={selectPlaceholder}
          />
          <FormTextField
            label={field("name")}
            value={entry.name}
            onChange={(value) =>
              updateRelative("paternalRelatives", index, { name: value })
            }
          />
          <FormSelectField
            label={field("education")}
            value={entry.education}
            onChange={(value) =>
              updateRelative("paternalRelatives", index, { education: value })
            }
            options={options(dropdowns, "education")}
            placeholder={selectPlaceholder}
            {...customSelectProps}
          />
          <FormSelectField
            label={field("profession")}
            value={entry.profession}
            onChange={(value) =>
              updateRelative("paternalRelatives", index, { profession: value })
            }
            options={options(dropdowns, "occupation")}
            placeholder={selectPlaceholder}
            {...customSelectProps}
          />
        </EntryCard>
      ))}

      <View style={styles.sectionHeader}>
        <FormSectionTitle
          title={discoverySectionTitle(locale, "maternalRelatives")}
        />
        <Pressable
          style={styles.addButton}
          onPress={() =>
            onChange({
              ...form,
              maternalRelatives: [...form.maternalRelatives, emptyRelativeEntry()],
            })
          }
        >
          <Text style={styles.addButtonText}>{copy.addMaternalRelative}</Text>
        </Pressable>
      </View>

      {form.maternalRelatives.map((entry, index) => (
        <EntryCard
          key={`maternal-${index}`}
          title={copy.entryLabel.replace("{number}", String(index + 1))}
          onRemove={() =>
            onChange({
              ...form,
              maternalRelatives: form.maternalRelatives.filter((_, i) => i !== index),
            })
          }
          removeLabel={copy.remove}
        >
          <FormSelectField
            label={field("relation")}
            value={entry.relation}
            onChange={(value) =>
              updateRelative("maternalRelatives", index, { relation: value })
            }
            options={relativeRelationOptions(locale, "maternal")}
            placeholder={selectPlaceholder}
          />
          <FormTextField
            label={field("name")}
            value={entry.name}
            onChange={(value) =>
              updateRelative("maternalRelatives", index, { name: value })
            }
          />
          <FormSelectField
            label={field("education")}
            value={entry.education}
            onChange={(value) =>
              updateRelative("maternalRelatives", index, { education: value })
            }
            options={options(dropdowns, "education")}
            placeholder={selectPlaceholder}
            {...customSelectProps}
          />
          <FormSelectField
            label={field("profession")}
            value={entry.profession}
            onChange={(value) =>
              updateRelative("maternalRelatives", index, { profession: value })
            }
            options={options(dropdowns, "occupation")}
            placeholder={selectPlaceholder}
            {...customSelectProps}
          />
        </EntryCard>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  addButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.rose800,
  },
  entryCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    padding: 14,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.zinc700,
  },
  removeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.red600,
  },
});
