import { dedupeRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { readJsonResponse } from "@/lib/parse-response";

function apiUrl(): string {
  return getApiBaseUrl();
}

export type MediaReviewStatus = "pending" | "approved" | "rejected";
export type ProfilePhotoType = "primary" | "gallery";
export type NidDocumentSide = "front" | "back";
export type NidStatus = "not_submitted" | "pending" | "verified" | "rejected";

export type ProfilePhoto = {
  id: string;
  type: ProfilePhotoType;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  status: MediaReviewStatus;
  createdAt: string;
};

export type NidDocumentSubject = "member" | "creator";

export type NidDocument = {
  id: string;
  side: NidDocumentSide;
  subject: NidDocumentSubject;
  mimeType: string;
  fileSize: number;
  status: MediaReviewStatus;
  submittedAt: string;
  reviewedAt: string | null;
};

export type VerificationAlertType =
  | "biodata_approved"
  | "biodata_rejected"
  | "nid_approved"
  | "nid_rejected"
  | "photo_approved_primary"
  | "photo_approved_gallery"
  | "photo_rejected_primary"
  | "photo_rejected_gallery"
  | "profile_fully_verified";

export type VerificationSummaryItem = {
  category: "biodata" | "nid" | "photo";
  labelKey: string;
  status: "not_submitted" | "pending" | "approved" | "rejected";
  needsAction: boolean;
  photoId?: string;
  photoType?: "primary" | "gallery";
};

export type VerificationFeedback = {
  alerts: {
    id: string;
    alertType: VerificationAlertType;
    officerMessage: string | null;
    contextKey: string | null;
    readAt: string | null;
    createdAt: string;
  }[];
  unreadCount: number;
  summary: VerificationSummaryItem[];
  isFullyVerified: boolean;
};

export type ProfileMedia = {
  creationMode: "self" | "on_behalf" | null;
  onBehalfRelation: string | null;
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  nidVerifiedAt: string | null;
  creatorNidVerifiedAt: string | null;
  profileBiodataReviewStatus: MediaReviewStatus | null;
  profileBiodataReviewedAt: string | null;
  photos: ProfilePhoto[];
  nidDocuments: NidDocument[];
  nidStatus: NidStatus;
  creatorNidStatus: NidStatus | null;
  verificationFeedback: VerificationFeedback;
};

export const MAX_GALLERY_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_NID_BYTES = 5 * 1024 * 1024;

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const NID_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const NID_EXTENSIONS = [...PHOTO_EXTENSIONS, "pdf"] as const;

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function resolveFileMimeType(file: File): string {
  const trimmed = file.type.trim();
  if (trimmed) return trimmed;
  return EXTENSION_TO_MIME[fileExtension(file.name)] ?? "";
}

function isAllowedFileType(
  file: File,
  allowedMimes: readonly string[],
  allowedExtensions: readonly string[],
): boolean {
  const mime = resolveFileMimeType(file);
  if (mime && allowedMimes.includes(mime)) return true;
  return allowedExtensions.includes(
    fileExtension(file.name) as (typeof allowedExtensions)[number],
  );
}

/** Map API upload errors to profile.errors translation keys. */
export function resolveMediaUploadErrorKey(message: string): string | null {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("photo must be 2 mb") ||
    normalized.includes("photo file is required") ||
    normalized.includes("file too large") ||
    normalized.includes("limit_file_size")
  ) {
    return "photoTooLarge";
  }
  if (
    normalized.includes("nid file must be 5 mb") ||
    normalized.includes("nid file is required") ||
    normalized.includes("file must be 5 mb")
  ) {
    return "nidTooLarge";
  }
  if (normalized.includes("photo must be jpeg")) {
    return "invalidPhotoType";
  }
  if (normalized.includes("nid must be jpeg")) {
    return "invalidNidType";
  }
  return null;
}

async function parseResponse<T>(res: Response): Promise<T> {
  return readJsonResponse<T>(res);
}

function authOnlyHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getVerificationFeedback(token: string) {
  return dedupeRequest(
    `verification-feedback:${token}`,
    async () => {
      const res = await fetch(`${apiUrl()}/profiles/me/verification/feedback`, {
        headers: authOnlyHeaders(token),
      });
      return parseResponse<VerificationFeedback>(res);
    },
    30_000,
  );
}

export async function dismissVerificationAlerts(
  token: string,
  alertIds?: string[],
) {
  const res = await fetch(`${apiUrl()}/profiles/me/verification/alerts/dismiss`, {
    method: "POST",
    headers: {
      ...authOnlyHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ alertIds }),
  });
  return parseResponse<{ dismissed: number }>(res);
}

export async function submitForVerification(token: string) {
  const res = await fetch(`${apiUrl()}/profiles/me/verification/submit`, {
    method: "POST",
    headers: authOnlyHeaders(token),
  });
  return parseResponse<{
    submitted: boolean;
    profileBiodataReviewStatus: MediaReviewStatus | null;
    message?: string;
  }>(res);
}

export async function getProfileMedia(token: string) {
  return dedupeRequest(
    `profile-media:${token}`,
    async () => {
      const res = await fetch(`${apiUrl()}/profiles/me/media`, {
        headers: authOnlyHeaders(token),
      });
      return parseResponse<ProfileMedia>(res);
    },
    30_000,
  );
}

export async function uploadProfilePhoto(
  token: string,
  file: File,
  type: ProfilePhotoType,
  gallerySlot?: "other" | "family",
) {
  const form = new FormData();
  form.append("file", file);
  const params = new URLSearchParams({ type });
  if (gallerySlot) {
    params.set("slot", gallerySlot);
  }
  const res = await fetch(`${apiUrl()}/profiles/me/photos?${params.toString()}`, {
    method: "POST",
    headers: authOnlyHeaders(token),
    body: form,
  });
  return parseResponse<ProfilePhoto>(res);
}

export async function deleteProfilePhoto(token: string, photoId: string) {
  const res = await fetch(`${apiUrl()}/profiles/me/photos/${photoId}`, {
    method: "DELETE",
    headers: authOnlyHeaders(token),
  });
  return parseResponse<{ deleted: boolean }>(res);
}

export async function setPrimaryPhoto(token: string, photoId: string) {
  const res = await fetch(`${apiUrl()}/profiles/me/photos/${photoId}/primary`, {
    method: "PUT",
    headers: authOnlyHeaders(token),
  });
  return parseResponse<ProfilePhoto>(res);
}

export async function uploadNidDocument(
  token: string,
  file: File,
  side: NidDocumentSide,
  subject: NidDocumentSubject = "member",
) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${apiUrl()}/profiles/me/nid?side=${side}&subject=${subject}`,
    {
    method: "POST",
    headers: authOnlyHeaders(token),
    body: form,
  });
  return parseResponse<NidDocument>(res);
}

export async function deleteNidDocument(
  token: string,
  side: NidDocumentSide,
  subject: NidDocumentSubject = "member",
) {
  const res = await fetch(
    `${apiUrl()}/profiles/me/nid/${side}?subject=${subject}`,
    {
    method: "DELETE",
    headers: authOnlyHeaders(token),
  });
  return parseResponse<{ deleted: boolean }>(res);
}

const blobCache = new Map<string, Promise<Blob>>();

export async function fetchAuthenticatedBlob(
  token: string,
  path: string,
): Promise<Blob> {
  const cacheKey = `${token}:${path}`;
  const cached = blobCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    const res = await fetch(`${apiUrl()}${path}`, {
      headers: authOnlyHeaders(token),
    });
    if (!res.ok) {
      throw new Error("Failed to load file");
    }
    return res.blob();
  })();

  blobCache.set(cacheKey, request);
  try {
    return await request;
  } catch (error) {
    blobCache.delete(cacheKey);
    throw error;
  }
}

export function photoFileUrl(photoId: string) {
  return `/profiles/me/photos/${photoId}/file`;
}

export function nidFileUrl(
  side: NidDocumentSide,
  subject: NidDocumentSubject = "member",
) {
  return `/profiles/me/nid/${side}/file?subject=${subject}`;
}

export function validatePhotoFile(file: File): string | null {
  if (file.size > MAX_PHOTO_BYTES) {
    return "photoTooLarge";
  }
  if (!isAllowedFileType(file, PHOTO_ACCEPT.split(","), PHOTO_EXTENSIONS)) {
    return "invalidPhotoType";
  }
  return null;
}

export function validateNidFile(file: File): string | null {
  if (file.size > MAX_NID_BYTES) {
    return "nidTooLarge";
  }
  if (!isAllowedFileType(file, NID_ACCEPT.split(","), NID_EXTENSIONS)) {
    return "invalidNidType";
  }
  return null;
}

export { PHOTO_ACCEPT, NID_ACCEPT };
