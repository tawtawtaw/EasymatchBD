import { apiRequest, apiUpload } from "./api/client";
import { dedupeRequest, invalidateDedupeCache } from "./api/dedupe";
import type {
  NidDocument,
  NidDocumentSide,
  NidDocumentSubject,
  ProfileMedia,
  ProfilePhoto,
  ProfilePhotoType,
  VerificationFeedback,
} from "../types/media";

type UploadFile = { uri: string; name: string; type: string };

const PROFILE_MEDIA_DEDUPE_MS = 4_000;
const VERIFICATION_FEEDBACK_DEDUPE_MS = 4_000;

export function invalidateProfileMediaCaches() {
  invalidateDedupeCache("profile:media");
  invalidateDedupeCache("profile:verification-feedback");
}

export async function getProfileMedia(options?: { forceFresh?: boolean }) {
  if (options?.forceFresh) {
    invalidateDedupeCache("profile:media");
  }
  return dedupeRequest(
    "profile:media",
    () => apiRequest<ProfileMedia>("/profiles/me/media"),
    PROFILE_MEDIA_DEDUPE_MS,
  );
}

export async function getVerificationFeedback(options?: { forceFresh?: boolean }) {
  if (options?.forceFresh) {
    invalidateDedupeCache("profile:verification-feedback");
  }
  return dedupeRequest(
    "profile:verification-feedback",
    () => apiRequest<VerificationFeedback>("/profiles/me/verification/feedback"),
    VERIFICATION_FEEDBACK_DEDUPE_MS,
  );
}

export async function dismissVerificationAlerts(alertIds?: string[]) {
  return apiRequest<{ dismissed: number }>(
    "/profiles/me/verification/alerts/dismiss",
    {
      method: "POST",
      body: JSON.stringify({ alertIds }),
    },
  );
}

export async function uploadProfilePhoto(
  file: UploadFile,
  type: ProfilePhotoType,
  gallerySlot?: "other" | "family",
) {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  const params = new URLSearchParams({ type });
  if (gallerySlot) {
    params.set("slot", gallerySlot);
  }
  const photo = await apiUpload<ProfilePhoto>(
    `/profiles/me/photos?${params.toString()}`,
    formData,
  );
  invalidateProfileMediaCaches();
  return photo;
}

export async function deleteProfilePhoto(photoId: string) {
  const result = await apiRequest<{ deleted: boolean }>(
    `/profiles/me/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" },
  );
  invalidateProfileMediaCaches();
  return result;
}

export async function setPrimaryPhoto(photoId: string) {
  const photo = await apiRequest<ProfilePhoto>(
    `/profiles/me/photos/${encodeURIComponent(photoId)}/primary`,
    { method: "PUT" },
  );
  invalidateProfileMediaCaches();
  return photo;
}

export async function uploadNidDocument(
  file: UploadFile,
  side: NidDocumentSide,
  subject: NidDocumentSubject = "member",
) {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  const doc = await apiUpload<NidDocument>(
    `/profiles/me/nid?side=${side}&subject=${subject}`,
    formData,
  );
  invalidateProfileMediaCaches();
  return doc;
}

export async function deleteNidDocument(
  side: NidDocumentSide,
  subject: NidDocumentSubject = "member",
) {
  const result = await apiRequest<{ deleted: boolean }>(
    `/profiles/me/nid/${side}?subject=${subject}`,
    { method: "DELETE" },
  );
  invalidateProfileMediaCaches();
  return result;
}

export async function submitForVerification() {
  const result = await apiRequest<{
    submitted: boolean;
    message?: string;
    profileBiodataReviewStatus?: ProfileMedia["profileBiodataReviewStatus"];
  }>("/profiles/me/verification/submit", { method: "POST" });
  invalidateProfileMediaCaches();
  return result;
}

export function profilePhotoUrl(photoId: string) {
  return `/profiles/me/photos/${encodeURIComponent(photoId)}/file`;
}
