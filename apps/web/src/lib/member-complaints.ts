import { isValidProfileCode, normalizeProfileCode } from "@easymatch/shared";
import { dedupeRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
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
  reporter?: {
    fullName: string | null;
    profileCode: string | null;
  };
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

export type ComplaintDiaryEntry = {
  id: string;
  complaintId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
};

export const COMPLAINT_CATEGORIES: MemberComplaintCategory[] = [
  "misrepresentation",
  "harassment",
  "fraud",
  "inappropriate_behavior",
  "other",
];

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type ComplaintTargetLookup =
  | { found: false; reason: "invalid" | "not_found" | "self" }
  | {
      found: true;
      profileCode: string;
      isVerified: boolean;
    };

export function memberComplaintHref(profileCode?: string | null) {
  const normalized = profileCode ? normalizeProfileCode(profileCode) : "";
  if (isValidProfileCode(normalized)) {
    return `/complaints?profileCode=${encodeURIComponent(normalized)}`;
  }
  return "/complaints";
}

export async function lookupComplaintTarget(token: string, profileCode: string) {
  const normalized = normalizeProfileCode(profileCode);
  const res = await apiFetch(
    `${getApiBaseUrl()}/complaints/targets/lookup?profileCode=${encodeURIComponent(normalized)}`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ComplaintTargetLookup>(res);
}

export async function listMemberComplaints(token: string) {
  return dedupeRequest(
    "member-complaints",
    async () => {
      const res = await apiFetch(`${getApiBaseUrl()}/complaints`, {
        headers: authHeaders(token),
      });
      return readJsonResponse<MemberComplaintItem[]>(res);
    },
    15_000,
  );
}

export async function createMemberComplaint(
  token: string,
  input: {
    profileCode: string;
    category: MemberComplaintCategory;
    description: string;
  },
) {
  const res = await apiFetch(`${getApiBaseUrl()}/complaints`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return readJsonResponse<MemberComplaintItem>(res);
}

export async function getMemberComplaint(token: string, complaintId: string) {
  const res = await apiFetch(`${getApiBaseUrl()}/complaints/${complaintId}`, {
    headers: authHeaders(token),
  });
  return readJsonResponse<MemberComplaintDetail>(res);
}

export async function cancelMemberComplaint(token: string, complaintId: string) {
  const res = await apiFetch(`${getApiBaseUrl()}/complaints/${complaintId}/cancel`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return readJsonResponse<MemberComplaintItem>(res);
}

export async function listComplaintMessages(token: string, complaintId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/complaints/${complaintId}/messages`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ComplaintMessage[]>(res);
}

export async function sendComplaintMessage(
  token: string,
  complaintId: string,
  body: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/complaints/${complaintId}/messages`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ body }),
    },
  );
  return readJsonResponse<ComplaintMessage>(res);
}
