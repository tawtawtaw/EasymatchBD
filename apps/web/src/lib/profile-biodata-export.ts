import { EASYMATCH_API_URL } from "@easymatch/shared";
import { dedupeRequest } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;
const EXPORT_DEDUPE_TTL_MS = 30_000;

export type BiodataAuditVerificationMeta = {
  phone: string;
  phoneVerifiedAt: string | null;
  nidVerifiedAt: string | null;
  creatorNidVerifiedAt: string | null;
  profileBiodataReviewStatus: string | null;
  profileBiodataReviewedAt: string | null;
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  creationMode: string | null;
  onBehalfRelation: string | null;
  nidDocuments: {
    subject: string;
    side: string;
    status: string;
    reviewedAt: string | null;
  }[];
};

export type BiodataExportPayload = {
  profileId?: string;
  profileCode: string;
  privacyLevel: number;
  generatedAt: string;
  auditRecord?: boolean;
  personal: Record<string, unknown>;
  marital: Record<string, unknown> | null;
  family: Record<string, unknown> | null;
  siblings: Record<string, unknown>[] | null;
  paternalRelatives: Record<string, unknown>[] | null;
  maternalRelatives: Record<string, unknown>[] | null;
  partner: Record<string, unknown> | null;
  media: {
    primaryPhotoId: string | null;
    galleryPhotoIds: string[];
    isVerified: boolean;
    verifiedOnBehalf?: boolean;
    memberNidVerified?: boolean;
    phone: string | null;
  };
  hiddenFieldCount: number;
  verification?: BiodataAuditVerificationMeta;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & {
    message?: string | string[];
  };
  if (!res.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function fetchBiodataExport(
  token: string,
  level: number,
): Promise<BiodataExportPayload> {
  return dedupeRequest(
    `biodata-export:${token}:${level}`,
    async () => {
      const res = await fetch(
        `${API_URL}/profiles/me/biodata-export?level=${level}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return parseResponse<BiodataExportPayload>(res);
    },
    EXPORT_DEDUPE_TTL_MS,
  );
}
