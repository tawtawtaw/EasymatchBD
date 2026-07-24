import { apiRequest } from "./api/client";
import { dedupeRequest } from "./api/dedupe";
import type { ProfileComparison } from "../types/comparison";

export async function getProfileComparison(profileId: string) {
  return dedupeRequest(
    `discovery-comparison:${profileId}`,
    () =>
      apiRequest<ProfileComparison>(
        `/discovery/profiles/${encodeURIComponent(profileId)}/comparison`,
      ),
    60_000,
  );
}
