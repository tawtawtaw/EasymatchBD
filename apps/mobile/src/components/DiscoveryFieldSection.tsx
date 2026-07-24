import { StyleSheet, Text, View } from "react-native";
import type { AppLocale } from "../lib/locale";
import {
  BIODATA_SKIP_KEYS,
  KNOWN_PARTNER_FIELD_KEYS,
  KNOWN_PRIVACY_FIELD_KEYS,
  KNOWN_RELATIVE_FIELD_KEYS,
  KNOWN_SIBLING_FIELD_KEYS,
  createFieldOptionResolver,
  formatBiodataFieldValue,
  humanizeFieldKey,
  resolvePrivacyLabelKey,
} from "../lib/biodata-display";
import {
  biodataCommonLabel,
  discoverySectionTitle,
  partnerFieldLabel,
  privacyFieldLabel,
  profileFieldLabel,
} from "../i18n/biodata-fields";
import type { DropdownMap } from "../types/dropdowns";
import { colors } from "../theme/colors";

export type BiodataSectionKind =
  | "personal"
  | "family"
  | "marital"
  | "partner"
  | "siblings"
  | "paternal_relatives"
  | "maternal_relatives";

type Props = {
  title: string;
  kind: BiodataSectionKind;
  data: Record<string, unknown> | Record<string, unknown>[] | null;
  dropdowns: DropdownMap;
  locale: AppLocale;
  personal?: Record<string, unknown>;
};

type Row = { key: string; label: string; value: string };

function labelForKey(locale: AppLocale, key: string, kind: BiodataSectionKind): string {
  if (kind === "partner") {
    if (KNOWN_PARTNER_FIELD_KEYS.has(key)) {
      return partnerFieldLabel(locale, key);
    }
    return humanizeFieldKey(key);
  }

  if (kind === "siblings") {
    if (KNOWN_SIBLING_FIELD_KEYS.has(key)) {
      return profileFieldLabel(locale, key);
    }
    return humanizeFieldKey(key);
  }

  if (kind === "paternal_relatives" || kind === "maternal_relatives") {
    if (KNOWN_RELATIVE_FIELD_KEYS.has(key)) {
      return profileFieldLabel(locale, key);
    }
    return humanizeFieldKey(key);
  }

  const labelKey = resolvePrivacyLabelKey(key);
  if ((KNOWN_PRIVACY_FIELD_KEYS as ReadonlySet<string>).has(labelKey)) {
    return privacyFieldLabel(locale, labelKey);
  }
  return humanizeFieldKey(labelKey);
}

function buildRows(
  entries: [string, unknown][],
  kind: BiodataSectionKind,
  locale: AppLocale,
  dropdowns: DropdownMap,
  personal?: Record<string, unknown>,
): Row[] {
  const resolveStaticOption = createFieldOptionResolver((relativeKey) =>
    profileFieldLabel(locale, relativeKey),
  );

  const relativeRelationGroup =
    kind === "paternal_relatives"
      ? "paternalRelativeRelationOptions"
      : kind === "maternal_relatives"
        ? "maternalRelativeRelationOptions"
        : undefined;

  const formatValue = (key: string, value: unknown) =>
    formatBiodataFieldValue(key, value, {
      locale,
      dropdowns,
      personal,
      resolveStaticOption,
      yesLabel: biodataCommonLabel(locale, "yes"),
      noLabel: biodataCommonLabel(locale, "no"),
      relativeRelationGroup,
      translateField: (key) => profileFieldLabel(locale, key),
      allDistrictsLabel: profileFieldLabel(locale, "allDistrictsOfBangladesh"),
      anyReligionLabel: profileFieldLabel(locale, "anyReligion"),
    });

  return entries
    .filter(
      ([key, value]) =>
        !BIODATA_SKIP_KEYS.has(key) &&
        value !== null &&
        value !== undefined &&
        value !== "",
    )
    .map(([key, value]) => ({
      key,
      label: labelForKey(locale, key, kind),
      value: formatValue(key, value),
    }));
}

function FieldRows({ rows }: { rows: Row[] }) {
  return (
    <View>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function DiscoveryFieldSection({
  title,
  kind,
  data,
  dropdowns,
  locale,
  personal,
}: Props) {
  if (!data) return null;

  if (Array.isArray(data)) {
    if (data.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {data.map((entry, index) => {
          const rows = buildRows(Object.entries(entry), kind, locale, dropdowns, personal);
          if (rows.length === 0) return null;

          return (
            <View key={index} style={styles.entryBlock}>
              <Text style={styles.entryHeading}>
                {discoverySectionTitle(locale, "entryNumber").replace(
                  "{number}",
                  String(index + 1),
                )}
              </Text>
              <FieldRows rows={rows} />
            </View>
          );
        })}
      </View>
    );
  }

  const rows = buildRows(Object.entries(data), kind, locale, dropdowns, personal);
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FieldRows rows={rows} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
    marginBottom: 10,
  },
  entryBlock: {
    marginBottom: 12,
  },
  entryHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.zinc500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc100,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.zinc500,
  },
  rowValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc900,
    textAlign: "right",
  },
});
