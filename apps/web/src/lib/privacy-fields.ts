import {
  EASYMATCH_API_URL,
  isFieldVisibleAtLevel,
  PROFILE_PRIVACY_FIELD_META,
} from "@easymatch/shared";
import { getApiBaseUrl } from "@/lib/api-base-url";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

export type PrivacyFieldRule = {
  fieldKey: string;
  section: string;
  isShareable: boolean;
  minPrivacyLevel: number;
  sortOrder: number;
};

/** Marketing levels 1–4 map to connection privacy tiers 0–3. */
export const PRIVACY_DISPLAY_LEVELS = [
  { displayLevel: 1, technicalLevel: 0 },
  { displayLevel: 2, technicalLevel: 1 },
  { displayLevel: 3, technicalLevel: 2 },
  { displayLevel: 4, technicalLevel: 3 },
] as const;

const SECTION_ORDER = ["personal", "family", "marital", "media", "partner"] as const;

function getDefaultPrivacyFieldRules(): PrivacyFieldRule[] {
  return Object.entries(PROFILE_PRIVACY_FIELD_META).map(
    ([fieldKey, meta], index) => ({
      fieldKey,
      section: meta.section,
      isShareable: meta.defaultShareable,
      minPrivacyLevel: meta.defaultMinLevel,
      sortOrder: index,
    }),
  );
}

export async function getPrivacyFieldRules(): Promise<PrivacyFieldRule[]> {
  try {
    const base = typeof window === "undefined" ? API_URL : getApiBaseUrl();
    const res = await fetch(`${base}/profiles/privacy-fields`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return getDefaultPrivacyFieldRules();
    }
    return (await res.json()) as PrivacyFieldRule[];
  } catch {
    return getDefaultPrivacyFieldRules();
  }
}

export function fieldsVisibleAtTechnicalLevel(
  fields: PrivacyFieldRule[],
  technicalLevel: number,
): PrivacyFieldRule[] {
  return fields.filter((field) =>
    isFieldVisibleAtLevel(field.isShareable, field.minPrivacyLevel, technicalLevel),
  );
}

export function fieldsNewAtTechnicalLevel(
  fields: PrivacyFieldRule[],
  technicalLevel: number,
): PrivacyFieldRule[] {
  return fields.filter(
    (field) =>
      field.isShareable &&
      field.minPrivacyLevel === technicalLevel,
  );
}

export function groupPrivacyFieldsBySection(fields: PrivacyFieldRule[]) {
  const grouped = new Map<string, PrivacyFieldRule[]>();
  for (const field of fields) {
    const list = grouped.get(field.section) ?? [];
    list.push(field);
    grouped.set(field.section, list);
  }

  return SECTION_ORDER.filter((section) => grouped.has(section)).map((section) => ({
    section,
    fields: (grouped.get(section) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}
