import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import type {
  ComplaintDiaryEntry,
  ComplaintMessage,
  MemberComplaintDetail,
  MemberComplaintItem,
  MemberComplaintStatus,
} from "@/lib/member-complaints";

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listConsultantComplaints(token: string) {
  const res = await apiFetch(`${getApiBaseUrl()}/consultant/complaints`, {
    headers: authHeaders(token),
  });
  return readJsonResponse<MemberComplaintItem[]>(res);
}

export async function getConsultantComplaint(token: string, complaintId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<MemberComplaintDetail>(res);
}

export async function assignConsultantComplaint(token: string, complaintId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/assign`,
    { method: "POST", headers: authHeaders(token) },
  );
  return readJsonResponse<MemberComplaintItem>(res);
}

export async function updateConsultantComplaintStatus(
  token: string,
  complaintId: string,
  status: MemberComplaintStatus,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/status`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    },
  );
  return readJsonResponse<MemberComplaintItem>(res);
}

export async function resolveConsultantComplaint(
  token: string,
  complaintId: string,
  status: "resolved" | "dismissed",
  resolutionNote?: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/resolve`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ status, resolutionNote }),
    },
  );
  return readJsonResponse<MemberComplaintItem>(res);
}

export async function listConsultantComplaintMessages(
  token: string,
  complaintId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/messages`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ComplaintMessage[]>(res);
}

export async function sendConsultantComplaintMessage(
  token: string,
  complaintId: string,
  body: string,
  isPrivate?: boolean,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/messages`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ body, isPrivate }),
    },
  );
  return readJsonResponse<ComplaintMessage>(res);
}

export async function listConsultantComplaintDiary(
  token: string,
  complaintId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/diary`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ComplaintDiaryEntry[]>(res);
}

export async function createConsultantComplaintDiaryEntry(
  token: string,
  complaintId: string,
  body: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/diary`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ body }),
    },
  );
  return readJsonResponse<ComplaintDiaryEntry>(res);
}

export async function updateConsultantComplaintDiaryEntry(
  token: string,
  complaintId: string,
  entryId: string,
  body: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/diary/${entryId}`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ body }),
    },
  );
  return readJsonResponse<ComplaintDiaryEntry>(res);
}

export async function deleteConsultantComplaintDiaryEntry(
  token: string,
  complaintId: string,
  entryId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/diary/${entryId}`,
    { method: "DELETE", headers: authHeaders(token) },
  );
  return readJsonResponse<{ deleted: boolean }>(res);
}

export type ComplaintChatHistory = {
  hasConnection: boolean;
  connectionId: string | null;
  privacyLevel: number | null;
  connectionCreatedAt: string | null;
  reporter: {
    userId: string;
    profileCode: string | null;
    fullName: string | null;
  };
  target: {
    userId: string;
    profileCode: string | null;
    fullName: string | null;
  };
  messages: ComplaintChatMessage[];
  interests: ComplaintInterestRecord[];
  messageCount: number;
};

export type ComplaintChatMessage = {
  id: string;
  senderId: string;
  senderSide: "reporter" | "target" | "unknown";
  messageType: string;
  body: string | null;
  isDeleted: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  hasAttachment: boolean;
  attachmentMimeType: string | null;
  attachmentFileName: string | null;
  createdAt: string;
};

export type ComplaintInterestRecord = {
  id: string;
  from: "reporter" | "target";
  status: string;
  createdAt: string;
  respondedAt: string | null;
};

export async function getConsultantComplaintChatHistory(
  token: string,
  complaintId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/complaints/${complaintId}/chat-history`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ComplaintChatHistory>(res);
}
