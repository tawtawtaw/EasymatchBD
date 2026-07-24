export type MemberComplaintCategory =
  | "misrepresentation"
  | "harassment"
  | "fraud"
  | "inappropriate_behavior"
  | "other";

export type MemberComplaintStatus =
  | "submitted"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "dismissed"
  | "cancelled";

export type MemberComplaintItem = {
  id: string;
  reporterId: string;
  targetProfileId: string;
  category: MemberComplaintCategory;
  description: string;
  status: MemberComplaintStatus;
  assignedConsultantId: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  targetProfile?: {
    id: string;
    profileCode: string;
  };
  assignedConsultantName: string | null;
};

export type MemberComplaintDetail = MemberComplaintItem & {
  viewerIsConsultant: boolean;
  viewerIsReporter: boolean;
};

export type ComplaintMessage = {
  id: string;
  complaintId: string;
  senderId: string;
  body: string;
  isPrivate: boolean;
  createdAt: string;
  senderName: string | null;
  senderIsConsultant: boolean;
};

export type ComplaintTargetLookup =
  | { found: false; reason: "invalid" | "not_found" | "self" }
  | {
      found: true;
      profileCode: string;
      isVerified: boolean;
    };

export const COMPLAINT_CATEGORIES: MemberComplaintCategory[] = [
  "misrepresentation",
  "harassment",
  "fraud",
  "inappropriate_behavior",
  "other",
];
