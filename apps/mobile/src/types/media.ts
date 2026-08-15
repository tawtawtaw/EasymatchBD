export type MediaReviewStatus = "pending" | "approved" | "rejected";
export type ProfilePhotoType = "primary" | "gallery";
export type NidDocumentSide = "front" | "back";
export type NidStatus = "not_submitted" | "pending" | "verified" | "rejected";
export type NidDocumentSubject = "member" | "creator";

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

export type ProfilePhoto = {
  id: string;
  type: ProfilePhotoType;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  status: MediaReviewStatus;
  createdAt: string;
};

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

export type ProfileMedia = {
  creationMode: "self" | "on_behalf" | null;
  onBehalfRelation: string | null;
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  nidVerifiedAt: string | null;
  creatorNidVerifiedAt: string | null;
  profileBiodataReviewStatus: MediaReviewStatus | null;
  photos: ProfilePhoto[];
  nidDocuments: NidDocument[];
  nidStatus: NidStatus;
  creatorNidStatus: NidStatus | null;
  verificationFeedback?: VerificationFeedback;
};

export const MAX_GALLERY_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_NID_BYTES = 5 * 1024 * 1024;
