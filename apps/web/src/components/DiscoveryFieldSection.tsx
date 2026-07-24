"use client";

import { useLocale, useTranslations } from "next-intl";
import type { DropdownMap } from "@/lib/api";
import {
  BIODATA_SKIP_KEYS,
  createFieldOptionResolver,
  formatBiodataFieldValue,
  humanizeFieldKey,
  KNOWN_PARTNER_FIELD_KEYS,
  KNOWN_PRIVACY_FIELD_KEYS,
  KNOWN_RELATIVE_FIELD_KEYS,
  KNOWN_SIBLING_FIELD_KEYS,
  resolvePrivacyLabelKey,
} from "@/lib/biodata-display";
import {
  BiodataFieldRows,
  BiodataSectionShell,
  biodataThemeForSection,
} from "@/components/BiodataFieldRows";

type SectionKind =
  | "personal"
  | "family"
  | "marital"
  | "partner"
  | "siblings"
  | "paternal_relatives"
  | "maternal_relatives";

type DiscoveryFieldSectionProps = {
  title: string;
  kind: SectionKind;
  data: Record<string, unknown> | Record<string, unknown>[] | null;
  dropdowns: DropdownMap;
  personal?: Record<string, unknown>;
};

function useFieldFormatters(
  dropdowns: DropdownMap,
  kind: SectionKind,
  personal?: Record<string, unknown>,
) {
  const locale = useLocale();
  const tp = useTranslations("admin.privacyFields.fields");
  const tf = useTranslations("profile.fields");
  const tb = useTranslations("biodataExport");

  const resolveStaticOption = createFieldOptionResolver((relativeKey) =>
    tf(relativeKey as never),
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
      yesLabel: tb("yes"),
      noLabel: tb("no"),
      relativeRelationGroup,
      translateField: (key) => tf(key as never),
      allDistrictsLabel: tf("allDistrictsOfBangladesh"),
      anyReligionLabel: tf("anyReligion"),
    });

  const labelForKey = (key: string, kind: SectionKind) => {
    if (kind === "partner") {
      if (KNOWN_PARTNER_FIELD_KEYS.has(key)) {
        return tb(`partnerFields.${key}` as never);
      }
      return humanizeFieldKey(key);
    }

    if (kind === "siblings") {
      if (KNOWN_SIBLING_FIELD_KEYS.has(key)) {
        return tf(key as never);
      }
      return humanizeFieldKey(key);
    }

    if (kind === "paternal_relatives" || kind === "maternal_relatives") {
      if (KNOWN_RELATIVE_FIELD_KEYS.has(key)) {
        return tf(key as never);
      }
      return humanizeFieldKey(key);
    }

    const labelKey = resolvePrivacyLabelKey(key);
    if (KNOWN_PRIVACY_FIELD_KEYS.has(labelKey)) {
      return tp(labelKey as never);
    }
    return humanizeFieldKey(labelKey);
  };

  return { formatValue, labelForKey };
}

function buildRows(
  entries: [string, unknown][],
  kind: SectionKind,
  labelForKey: (key: string, kind: SectionKind) => string,
  formatValue: (key: string, value: unknown) => string,
) {
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
      label: labelForKey(key, kind),
      value: formatValue(key, value),
    }));
}

export function DiscoveryFieldSection({
  title,
  kind,
  data,
  dropdowns,
  personal,
}: DiscoveryFieldSectionProps) {
  const { formatValue, labelForKey } = useFieldFormatters(dropdowns, kind, personal);
  const theme = biodataThemeForSection(kind);

  if (!data) return null;

  if (Array.isArray(data)) {
    if (data.length === 0) return null;

    return (
      <BiodataSectionShell title={title} theme={theme}>
        <ul className="space-y-4">
          {data.map((entry, index) => {
            const rows = buildRows(
              Object.entries(entry),
              kind,
              labelForKey,
              formatValue,
            );
            if (rows.length === 0) return null;

            return (
              <li key={index}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                  #{index + 1}
                </p>
                <BiodataFieldRows rows={rows} theme={theme} />
              </li>
            );
          })}
        </ul>
      </BiodataSectionShell>
    );
  }

  const rows = buildRows(Object.entries(data), kind, labelForKey, formatValue);
  if (rows.length === 0) return null;

  return (
    <BiodataSectionShell title={title} theme={theme}>
      <BiodataFieldRows rows={rows} theme={theme} />
    </BiodataSectionShell>
  );
}
