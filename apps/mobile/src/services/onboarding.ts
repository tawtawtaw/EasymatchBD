import type {
  OnBehalfRelation,
  ProfileCreationMode,
  TermsSection,
} from "@easymatch/shared";
import { apiRequest } from "./api/client";
import type { MemberProfile } from "../types/profile";

export type PublishedTerms = {
  version: string;
  effectiveDate: string;
  sections: TermsSection[];
  publishedAt: string;
};

export async function getPublishedTerms(locale = "en") {
  return apiRequest<PublishedTerms>(
    `/legal/terms?locale=${encodeURIComponent(locale)}`,
    { auth: false },
  );
}

export async function acceptTerms(version: string) {
  return apiRequest<{ accepted: boolean; termsVersion: string }>("/auth/terms/accept", {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}

export async function declineTerms() {
  return apiRequest<{ declined: boolean }>("/auth/terms/decline", {
    method: "POST",
  });
}

export async function setCreationIntent(input: {
  creationMode: ProfileCreationMode;
  onBehalfRelation?: OnBehalfRelation;
}) {
  return apiRequest<MemberProfile>("/profiles/me/creation-intent", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
