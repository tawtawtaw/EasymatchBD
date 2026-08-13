import { getApiBaseUrl } from "@/lib/api-base-url";
import { dedupeRequest } from "@/lib/api";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import type {
  ComparisonCriterionKey,
  ComparisonDirectionResult,
  ComparisonRow,
  ComparisonStatus,
  MaritalAlignmentResult,
} from "@easymatch/shared";

async function parseResponse<T>(res: Response): Promise<T> {
  return readJsonResponse<T>(res);
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

import type { DiscoveryRelationship } from "@/lib/discovery";

export type ProfileComparison = {
  viewer: {
    profileId: string;
    profileCode: string;
    fullName: string | null;
  };
  other: {
    profileId: string;
    profileCode: string;
    fullName: string | null;
    isVerified: boolean;
  };
  relationship: DiscoveryRelationship;
  viewerPrivacyLevelToOther: number;
  otherPreferencesVisible: boolean;
  mutualScore: number;
  viewerToOther: ComparisonDirectionResult;
  otherToViewer: ComparisonDirectionResult;
  maritalAlignment: MaritalAlignmentResult;
};

export type { MaritalAlignmentResult };

export type {
  ComparisonCriterionKey,
  ComparisonDirectionResult,
  ComparisonRow,
  ComparisonStatus,
};

export async function getProfileComparison(
  token: string,
  profileId: string,
): Promise<ProfileComparison> {
  return dedupeRequest(
    `discovery-comparison:${profileId}`,
    async () => {
      const res = await apiFetch(
        `${getApiBaseUrl()}/discovery/profiles/${encodeURIComponent(profileId)}/comparison`,
        { headers: authHeaders(token) },
      );
      return parseResponse<ProfileComparison>(res);
    },
    60_000,
  );
}

/** Biodata field keys passed to formatBiodataFieldValue (see biodata-display FIELD_DROPDOWN_CATEGORY). */
export const COMPARISON_ATTRIBUTE_FIELD: Record<ComparisonCriterionKey, string> =
  {
    age: "date_of_birth",
    height: "heightCm",
    weight: "weightKg",
    district: "current_district",
    education: "highest_degree",
    profession: "occupation",
    marital_status: "marital_status",
    religion: "religion",
    beard: "has_beard",
    prayer: "prayer_practice",
    hijab: "hijab_practice",
  };

export const COMPARISON_PREFERENCE_FIELD: Record<ComparisonCriterionKey, string> =
  {
    age: "ageMin",
    height: "heightMinCm",
    weight: "weightMinKg",
    district: "preferredDistricts",
    education: "minimumEducation",
    profession: "preferredProfession",
    marital_status: "maritalStatusPref",
    religion: "preferredReligion",
    beard: "beardPreference",
    prayer: "prayerPreference",
    hijab: "hijabPreference",
  };
