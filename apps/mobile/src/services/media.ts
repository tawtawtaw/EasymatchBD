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

export async function getProfileMedia() {
  return dedupeRequest(
    "profile:media",
    () => apiRequest<ProfileMedia>("/profiles/me/media"),
    30_000,
  );
}

export async function getVerificationFeedback() {
  return dedupeRequest(
    "profile:verification-feedback",
    () => apiRequest<VerificationFeedback>("/profiles/me/verification/feedback"),
    60_000,
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
  return apiUpload<ProfilePhoto>(`/profiles/me/photos?${params.toString()}`, formData);
}

export async function deleteProfilePhoto(photoId: string) {
  return apiRequest<{ deleted: boolean }>(`/profiles/me/photos/${encodeURIComponent(photoId)}`, {
    method: "DELETE",
  });
}

export async function setPrimaryPhoto(photoId: string) {
  return apiRequest<ProfilePhoto>(
    `/profiles/me/photos/${encodeURIComponent(photoId)}/primary`,
    { method: "PUT" },
  );
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
  return apiUpload<NidDocument>(
    `/profiles/me/nid?side=${side}&subject=${subject}`,
    formData,
  );
}

export async function deleteNidDocument(
  side: NidDocumentSide,
  subject: NidDocumentSubject = "member",
) {
  return apiRequest<{ deleted: boolean }>(
    `/profiles/me/nid/${side}?subject=${subject}`,
    { method: "DELETE" },
  );
}

export async function submitForVerification() {
  const result = await apiRequest<{
    submitted: boolean;
    message?: string;
    profileBiodataReviewStatus?: ProfileMedia["profileBiodataReviewStatus"];
  }>("/profiles/me/verification/submit", { method: "POST" });
  invalidateDedupeCache("profile:media");
  return result;
}

export function profilePhotoUrl(photoId: string) {
  return `/profiles/me/photos/${encodeURIComponent(photoId)}/file`;
}
