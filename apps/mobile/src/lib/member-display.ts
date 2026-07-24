import type { AppLocale } from "./locale";
import { personalFieldLabel } from "../i18n/messages";
import { lookupDropdownLabel, formatPersonalFieldValue } from "./biodata-display";
import type { DropdownMap } from "../types/dropdowns";

export function resolveMemberDisplayName(
  member: {
    fullName?: string | null;
    profileCode?: string | null;
  },
  personal?: Record<string, unknown>,
  labels?: { profileRef?: (code: string) => string; member?: string },
) {
  const fromPersonal =
    typeof personal?.full_name === "string" ? personal.full_name.trim() : "";
  const trimmed = member.fullName?.trim() || fromPersonal;
  if (trimmed) return trimmed;
  if (member.profileCode?.trim()) {
    if (labels?.profileRef) {
      return labels.profileRef(member.profileCode.trim());
    }
    return `Profile ${member.profileCode.trim()}`;
  }
  return labels?.member ?? "Member";
}

export function resolveMemberDistrict(
  currentDistrict: string | null | undefined,
  dropdowns: DropdownMap = {},
) {
  const value = currentDistrict?.trim();
  if (!value) return null;
  return (
    lookupDropdownLabel(dropdowns, "district", value) ??
    value.charAt(0).toUpperCase() + value.slice(1)
  );
}

export function resolveMemberGender(
  gender: string | null | undefined,
  dropdowns: DropdownMap = {},
) {
  const value = gender?.trim();
  if (!value) return null;
  return (
    lookupDropdownLabel(dropdowns, "gender", value) ??
    value.charAt(0).toUpperCase() + value.slice(1)
  );
}

export function formatInterestProfileMeta(
  profile:
    | {
        gender?: string | null;
        currentDistrict?: string | null;
        isVerified?: boolean;
      }
    | null
    | undefined,
  dropdowns: DropdownMap = {},
  verifiedLabel?: string | null,
): string | null {
  if (!profile) return null;
  const parts = [
    resolveMemberGender(profile.gender, dropdowns),
    resolveMemberDistrict(profile.currentDistrict, dropdowns),
    profile.isVerified && verifiedLabel ? verifiedLabel : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function readPersonalString(
  personal: Record<string, unknown>,
  key: string,
): string | null {
  const value = personal[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function readPersonalFieldValue(
  personal: Record<string, unknown>,
  key: string,
): unknown {
  if (key === "height") {
    return personal.height ?? personal.heightCm ?? personal.height_cm;
  }
  if (key === "education") {
    return personal.education ?? personal.highest_degree;
  }
  return personal[key];
}

const PERSONAL_SUMMARY_KEYS = [
  "gender",
  "age",
  "marital_status",
  "religion",
  "education",
  "occupation",
  "current_district",
  "current_division",
  "height",
  "complexion",
] as const;

export function personalSummaryRows(
  personal: Record<string, unknown>,
  dropdowns: DropdownMap = {},
  locale: AppLocale = "en",
) {
  return PERSONAL_SUMMARY_KEYS.map((key) => ({
    label: personalFieldLabel(locale, key),
    value: formatPersonalFieldValue(key, readPersonalFieldValue(personal, key), dropdowns, locale),
  })).filter((row): row is { label: string; value: string } => Boolean(row.value));
}
