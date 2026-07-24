import { apiRequest } from "./api/client";
import { dedupeRequest, invalidateDedupeCache } from "./api/dedupe";
import type {
  ComplaintMessage,
  ComplaintTargetLookup,
  MemberComplaintCategory,
  MemberComplaintDetail,
  MemberComplaintItem,
} from "../types/complaints";

export async function listMemberComplaints(options?: { forceFresh?: boolean }) {
  if (options?.forceFresh) {
    invalidateDedupeCache("member-complaints");
  }
  return dedupeRequest(
    "member-complaints",
    () => apiRequest<MemberComplaintItem[]>("/complaints"),
    15_000,
  );
}

export async function lookupComplaintTarget(profileCode: string) {
  return apiRequest<ComplaintTargetLookup>(
    `/complaints/targets/lookup?profileCode=${encodeURIComponent(profileCode)}`,
  );
}

export async function createMemberComplaint(input: {
  profileCode: string;
  category: MemberComplaintCategory;
  description: string;
}) {
  const created = await apiRequest<MemberComplaintItem>("/complaints", {
    method: "POST",
    body: JSON.stringify(input),
  });
  invalidateDedupeCache("member-complaints");
  return created;
}

export async function getMemberComplaint(complaintId: string) {
  return apiRequest<MemberComplaintDetail>(
    `/complaints/${encodeURIComponent(complaintId)}`,
  );
}

export async function cancelMemberComplaint(complaintId: string) {
  const result = await apiRequest<MemberComplaintItem>(
    `/complaints/${encodeURIComponent(complaintId)}/cancel`,
    { method: "POST" },
  );
  invalidateDedupeCache("member-complaints");
  return result;
}

export async function listComplaintMessages(complaintId: string) {
  return apiRequest<ComplaintMessage[]>(
    `/complaints/${encodeURIComponent(complaintId)}/messages`,
  );
}

export async function sendComplaintMessage(complaintId: string, body: string) {
  return apiRequest<ComplaintMessage>(
    `/complaints/${encodeURIComponent(complaintId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );
}
