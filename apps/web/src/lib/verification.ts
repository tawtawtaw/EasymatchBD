import { type VerificationBiodataChanges } from "@easymatch/shared";
import type { BiodataExportPayload } from "@/lib/profile-biodata-export";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

export type MediaReviewStatus = "pending" | "approved" | "rejected";

export type VerificationQueueItem = {
  profileId: string;
  profileCode: string;
  userId: string;
  fullName: string | null;
  phone: string;
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  creationMode: "self" | "on_behalf" | null;
  onBehalfRelation: string | null;
  nidVerifiedAt: string | null;
  creatorNidVerifiedAt: string | null;
  pendingPhotoCount: number;
  nidReadyForReview: boolean;
  creatorNidReadyForReview: boolean;
  biodataPending: boolean;
  updatedAt: string;
};

export type VerificationPersonal = {
  fullName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  divorceDetails: string | null;
  childrenCount: number | null;
  heightUnit: "cm" | "ft_in";
  heightCm: number | null;
  weightKg: number | null;
  complexion: string | null;
  hasDisability: boolean;
  disabilityInfo: string | null;
  religion: string | null;
  hasBeard: string | null;
  smokingHabit: string | null;
  prayerPractice: string | null;
  hijabPractice: string | null;
  highestDegree: string | null;
  educationMedium: string | null;
  additionalEducationQualifications: string | null;
  institution: string | null;
  educationYear: number | null;
  educationSubject: string | null;
  occupation: string | null;
  company: string | null;
  designation: string | null;
  monthlyIncomeRange: string | null;
  currentCountry: string;
  currentDivision: string | null;
  currentDistrict: string | null;
  currentUpazila: string | null;
  currentCityTown: string | null;
  currentAddressLine: string | null;
  permanentCountry: string | null;
  permanentDivision: string | null;
  permanentDistrict: string | null;
  permanentUpazila: string | null;
  permanentCityTown: string | null;
  permanentAddressLine: string | null;
  permanentSameAsCurrent: boolean;
  biography: string | null;
  hobbies: string[];
  interests: string | null;
  introduction: string | null;
};

export type VerificationMarital = {
  expectedMarriageTimeline: string | null;
  dowryExpectation: string | null;
  weddingCeremonyPreference: string | null;
  expectedParenthoodTimeline: string | null;
  livingArrangements: string | null;
  livingArrangementsOther: string | null;
  expectedKabinAmountMinBdt: number | null;
  expectedKabinAmountMaxBdt: number | null;
};

export type VerificationFamilyInfo = {
  fatherName: string | null;
  fatherIsAlive: string | null;
  fatherEducation: string | null;
  fatherProfession: string | null;
  motherName: string | null;
  motherIsAlive: string | null;
  motherEducation: string | null;
  motherProfession: string | null;
  familyType: string | null;
  familyStatus: string | null;
  familyValues: string | null;
  familyAssets: string | null;
};

export type VerificationSibling = {
  relationship: string | null;
  name: string | null;
  education: string | null;
  profession: string | null;
  maritalStatus: string | null;
  spouseName: string | null;
  spouseEducation: string | null;
  spouseProfession: string | null;
};

export type VerificationRelative = {
  relation: string | null;
  name: string | null;
  education: string | null;
  profession: string | null;
};

export type VerificationPartnerPreference = {
  ageMin: number | null;
  ageMax: number | null;
  heightUnit: "cm" | "ft_in";
  heightMinCm: number | null;
  heightMaxCm: number | null;
  weightMinKg: number | null;
  weightMaxKg: number | null;
  preferredDistricts: string[];
  minimumEducation: string | null;
  preferredProfession: string[];
  beardPreference: string | null;
  prayerPreference: string | null;
  hijabPreference: string | null;
  maritalStatusPref: string[];
  additionalNotes: string | null;
};

export type VerificationSubmission = {
  profileId: string;
  profileCode?: string;
  userId: string;
  phone: string;
  phoneVerifiedAt: string | null;
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  creationMode: "self" | "on_behalf" | null;
  onBehalfRelation: string | null;
  nidVerifiedAt: string | null;
  creatorNidVerifiedAt: string | null;
  profileBiodataReviewStatus: MediaReviewStatus | null;
  profileBiodataReviewedAt: string | null;
  nidReadyForReview: boolean;
  creatorNidReadyForReview: boolean;
  personal: VerificationPersonal;
  marital: VerificationMarital;
  familyInfo: VerificationFamilyInfo | null;
  siblings: VerificationSibling[];
  paternalRelatives: VerificationRelative[];
  maternalRelatives: VerificationRelative[];
  partnerPreference: VerificationPartnerPreference | null;
  photos: {
    id: string;
    type: "primary" | "gallery";
    mimeType: string;
    fileSize: number;
    sortOrder: number;
    status: MediaReviewStatus;
    createdAt: string;
  }[];
  nidDocuments: {
    id: string;
    side: "front" | "back";
    subject: "member" | "creator";
    mimeType: string;
    fileSize: number;
    status: MediaReviewStatus;
    submittedAt: string;
    reviewedAt: string | null;
  }[];
  biodataChanges: VerificationBiodataChanges;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & {
    message?: string | string[];
    statusCode?: number;
  };
  if (!res.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getVerificationQueue(token: string) {
  const res = await apiFetch(`${getApiBaseUrl()}/verification/queue`, {
    headers: authHeaders(token),
  });
  return readJsonResponse<VerificationQueueItem[]>(res);
}

export async function getVerificationSubmission(token: string, profileId: string) {
  const res = await apiFetch(`${getApiBaseUrl()}/verification/submissions/${profileId}`, {
    headers: authHeaders(token),
  });
  return readJsonResponse<VerificationSubmission>(res);
}

export async function reviewPhoto(
  token: string,
  photoId: string,
  decision: "approved" | "rejected",
  officerMessage?: string,
) {
  const res = await fetch(`${getApiBaseUrl()}/verification/photos/${photoId}/review`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      decision,
      ...(decision === "rejected" ? { officerMessage } : {}),
    }),
  });
  return parseResponse<{ id: string; status: MediaReviewStatus; profileId: string }>(res);
}

export async function reviewProfileBiodata(
  token: string,
  profileId: string,
  decision: "approved" | "rejected",
  officerMessage?: string,
) {
  const res = await fetch(
    `${getApiBaseUrl()}/verification/profiles/${profileId}/biodata/review`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        decision,
        ...(decision === "rejected" ? { officerMessage } : {}),
      }),
    },
  );
  return parseResponse<{
    profileId: string;
    decision: string;
    profileBiodataReviewStatus: MediaReviewStatus;
    profileBiodataReviewedAt: string;
    isVerified: boolean;
  }>(res);
}

export async function reviewNid(
  token: string,
  profileId: string,
  decision: "approved" | "rejected",
  subject: "member" | "creator" = "member",
  officerMessage?: string,
) {
  const res = await fetch(
    `${getApiBaseUrl()}/verification/profiles/${profileId}/nid/review?subject=${subject}`,
    {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      decision,
      ...(decision === "rejected" ? { officerMessage } : {}),
    }),
  });
  return parseResponse<{
    profileId: string;
    decision: string;
    nidVerifiedAt: string | null;
  }>(res);
}

export async function fetchVerificationBlob(
  token: string,
  path: string,
): Promise<Blob> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Failed to load file");
  }
  return res.blob();
}

export function officerPhotoUrl(profileId: string, photoId: string) {
  return `/verification/profiles/${profileId}/photos/${photoId}/file`;
}

export async function fetchVerificationAuditBiodata(
  token: string,
  profileId: string,
): Promise<BiodataExportPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/verification/profiles/${profileId}/biodata-export`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return parseResponse<BiodataExportPayload>(res);
}

export function officerNidUrl(
  profileId: string,
  side: "front" | "back",
  subject: "member" | "creator" = "member",
) {
  return `/verification/profiles/${profileId}/nid/${side}/file?subject=${subject}`;
}

export const OFFICER_ROLES = new Set(["verification_officer", "super_admin"]);

export function isOfficerRole(role: string) {
  return OFFICER_ROLES.has(role);
}
