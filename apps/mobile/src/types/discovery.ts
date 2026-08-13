export type DiscoveryMedia = {
  primaryPhotoId: string | null;
  galleryPhotoIds: string[];
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  memberNidVerified: boolean;
  phone: string | null;
};

export type CompatibilitySummary = {
  score: number;
  matchedCount: number;
  totalCriteria: number;
};

export type DiscoveryListItem = {
  profileId: string;
  profileCode: string;
  userId: string;
  viewerPrivacyLevel: number;
  relationshipStatus: "none" | "interest_sent" | "interest_received" | "connected";
  personal: Record<string, unknown>;
  media: DiscoveryMedia;
  hiddenFieldCount: number;
  compatibility: CompatibilitySummary;
  /** Derived server-side, so it survives the date of birth being privacy-gated. */
  age?: number | null;
  isBookmarked?: boolean;
};

export type DiscoveryRelationship = {
  status: "self" | "none" | "interest_sent" | "interest_received" | "connected";
  viewerPrivacyLevel: number;
  connectionId?: string | null;
  connectionPrivacyLevel: number | null;
  pendingUpgradeLevel: number | null;
  pendingUpgradeByMe: boolean;
  sentInterestId?: string | null;
  receivedInterestId?: string | null;
};

export type DiscoveryProfile = {
  profileId: string;
  profileCode: string;
  userId: string;
  viewerPrivacyLevel: number;
  relationship: DiscoveryRelationship;
  compatibility: CompatibilitySummary;
  personal: Record<string, unknown>;
  marital: Record<string, unknown> | null;
  family: Record<string, unknown> | null;
  siblings: Record<string, unknown>[] | null;
  paternalRelatives: Record<string, unknown>[] | null;
  maternalRelatives: Record<string, unknown>[] | null;
  partner: Record<string, unknown> | null;
  media: DiscoveryMedia;
  visibleFieldKeys: string[];
  hiddenFieldCount: number;
  /** Derived server-side, so it survives the date of birth being privacy-gated. */
  age?: number | null;
  isBookmarked?: boolean;
};

export type InterestProfileSummary = {
  id: string;
  profileCode: string | null;
  fullName: string | null;
  gender: string | null;
  currentDistrict: string | null;
  currentDivision?: string | null;
  isVerified: boolean;
};

export type IncomingInterest = {
  id: string;
  createdAt: string;
  disclosureLevel: number;
  sender: {
    id: string;
    profile: InterestProfileSummary | null;
  };
};

export type OutgoingInterest = {
  id: string;
  createdAt: string;
  disclosureLevel: number;
  receiver: {
    id: string;
    profile: InterestProfileSummary | null;
  };
};

export type ConnectionItem = {
  connectionId: string;
  privacyLevel: number;
  pendingUpgradeLevel: number | null;
  pendingUpgradeByMe: boolean;
  updatedAt: string;
  member: {
    userId: string;
    profileId: string | null;
    profileCode: string | null;
    fullName: string | null;
    gender: string | null;
    currentDistrict: string | null;
    currentDivision: string | null;
    isVerified: boolean;
  };
};

export type MemberHomeBootstrap = {
  termsAccepted: boolean;
  profile: {
    fullName: string | null;
    profileCode: string | null;
    isVerified: boolean;
    completionPercent: number;
    primaryPhotoId: string | null;
  };
  stats: {
    incoming: number;
    outgoing: number;
    connections: number;
    conversations: number;
  };
  suggestions: DiscoveryListItem[];
};

export type SavedProfileItem = DiscoveryListItem & {
  bookmarkId: string;
  savedAt: string;
};
