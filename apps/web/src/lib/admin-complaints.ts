import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import type {
  ComplaintDiaryEntry,
  ComplaintMessage,
  MemberComplaintDetail,
  MemberComplaintItem,
  MemberComplaintStatus,
} from "@/lib/member-complaints";
import type { ComplaintChatHistory } from "@/lib/consultant-complaints";

export type AdminConsultantOption = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listAdminComplaints(
  token: string,
  status?: MemberComplaintStatus,
) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiFetch(`${getApiBaseUrl()}/admin/complaints${query}`, {
    headers: authHeaders(token),
  });
  return readJsonResponse<MemberComplaintItem[]>(res);
}

export async function listAdminComplaintConsultants(token: string) {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/complaints/consultants`, {
    headers: authHeaders(token),
  });
  return readJsonResponse<AdminConsultantOption[]>(res);
}

export async function getAdminComplaint(token: string, complaintId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/complaints/${complaintId}`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<MemberComplaintDetail & { viewerIsAdmin?: boolean }>(
    res,
  );
}

export async function getAdminComplaintChatHistory(
  token: string,
  complaintId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/complaints/${complaintId}/chat-history`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ComplaintChatHistory>(res);
}

export async function reassignAdminComplaint(
  token: string,
  complaintId: string,
  consultantId: string | null,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/complaints/${complaintId}/reassign`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ consultantId }),
    },
  );
  return readJsonResponse<MemberComplaintItem>(res);
}

export async function resolveAdminComplaint(
  token: string,
  complaintId: string,
  status: "resolved" | "dismissed",
  resolutionNote?: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/complaints/${complaintId}/resolve`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ status, resolutionNote }),
    },
  );
  return readJsonResponse<MemberComplaintItem>(res);
}

export async function listAdminComplaintMessages(
  token: string,
  complaintId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/complaints/${complaintId}/messages`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ComplaintMessage[]>(res);
}

export async function sendAdminComplaintMessage(
  token: string,
  complaintId: string,
  body: string,
  isPrivate?: boolean,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/complaints/${complaintId}/messages`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ body, isPrivate }),
    },
  );
  return readJsonResponse<ComplaintMessage>(res);
}

export async function listAdminComplaintDiary(
  token: string,
  complaintId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/complaints/${complaintId}/diary`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ComplaintDiaryEntry[]>(res);
}

export async function createAdminComplaintDiaryEntry(
  token: string,
  complaintId: string,
  body: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/complaints/${complaintId}/diary`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ body }),
    },
  );
  return readJsonResponse<ComplaintDiaryEntry>(res);
}