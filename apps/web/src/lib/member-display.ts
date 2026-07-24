import { lookupDropdownLabel } from "./biodata-display";
import type { DropdownMap } from "./api";

export function resolveMemberDisplayName(
  member: {
    fullName?: string | null;
    profileCode?: string | null;
  },
  labels: {
    profileRef: (code: string) => string;
    anonymous: string;
  },
) {
  const trimmed = member.fullName?.trim();
  if (trimmed) return trimmed;
  if (member.profileCode?.trim()) {
    return labels.profileRef(member.profileCode.trim());
  }
  return labels.anonymous;
}

export function resolveMemberDistrict(
  currentDistrict: string | null | undefined,
  dropdowns?: DropdownMap,
) {
  const value = currentDistrict?.trim();
  if (!value) return null;
  return (
    lookupDropdownLabel(dropdowns ?? {}, "district", value) ??
    value.charAt(0).toUpperCase() + value.slice(1)
  );
}

export function resolveMemberGender(
  gender: string | null | undefined,
  dropdowns?: DropdownMap,
) {
  const value = gender?.trim();
  if (!value) return null;
  return (
    lookupDropdownLabel(dropdowns ?? {}, "gender", value) ??
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
  dropdowns?: DropdownMap,
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
