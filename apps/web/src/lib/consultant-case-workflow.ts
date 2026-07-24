import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

export type ConsultantCaseMessage = {
  id: string;
  body: string;
  createdAt: string;
  audience: "both" | "member";
  recipient: { id: string; displayName: string } | null;
  sender: {
    id: string;
    role: string;
    isConsultant: boolean;
    displayName: string;
  };
  isMine: boolean;
};

export type ConsultantDiaryEntry = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ConsultantMeeting = {
  id: string;
  scheduledAt: string;
  agenda: string | null;
  status: string;
  videoCall: {
    id: string;
    status: string;
    scheduledAt: string | null;
  } | null;
  createdAt: string;
};

export type ConsultantCaseDetail = {
  id: string;
  connectionId: string;
  serviceType: string;
  serviceLabelEn: string;
  amountBdt: string;
  status: string;
  assignedConsultantId: string | null;
  memberNotes: string | null;
  createdAt: string;
  requester: { fullName: string | null; profileCode: string | null };
  connection: {
    privacyLevel: number;
    memberLow: {
      userId: string;
      fullName: string | null;
      profileCode: string | null;
    };
    memberHigh: {
      userId: string;
      fullName: string | null;
      profileCode: string | null;
    };
  };
  linkedVideoCall: {
    id: string;
    status: string;
    scheduledAt: string | null;
  } | null;
  viewerIsConsultant: boolean;
  viewerIsMember: boolean;
};

export type ConsultantLiveKitToken = {
  token: string;
  url: string;
  roomName: string;
  callId: string;
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getConsultantCaseDetail(token: string, caseId: string) {
  const res = await apiFetch(`${getApiBaseUrl()}/consultant/cases/${caseId}`, {
    headers: authHeaders(token),
  });
  return readJsonResponse<ConsultantCaseDetail>(res);
}

export async function listConsultantCaseMessages(token: string, caseId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/messages`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ConsultantCaseMessage[]>(res);
}

export async function sendConsultantCaseMessage(
  token: string,
  caseId: string,
  body: string,
  options?: { recipientId?: string | null },
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/messages`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        body,
        ...(options?.recipientId ? { recipientId: options.recipientId } : {}),
      }),
    },
  );
  return readJsonResponse<ConsultantCaseMessage>(res);
}

export async function listConsultantDiary(token: string, caseId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/diary`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ConsultantDiaryEntry[]>(res);
}

export async function createConsultantDiaryEntry(
  token: string,
  caseId: string,
  body: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/diary`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ body }),
    },
  );
  return readJsonResponse<ConsultantDiaryEntry>(res);
}

export async function updateConsultantDiaryEntry(
  token: string,
  caseId: string,
  entryId: string,
  body: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/diary/${entryId}`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ body }),
    },
  );
  return readJsonResponse<ConsultantDiaryEntry>(res);
}

export async function deleteConsultantDiaryEntry(
  token: string,
  caseId: string,
  entryId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/diary/${entryId}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    },
  );
  return readJsonResponse<{ ok: boolean }>(res);
}

export async function listConsultantMeetings(token: string, caseId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/meetings`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ConsultantMeeting[]>(res);
}

export async function scheduleConsultantMeeting(
  token: string,
  caseId: string,
  body: {
    scheduledAt: string;
    agenda?: string;
    includeVideoCall?: boolean;
  },
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/meetings`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );
  return readJsonResponse<ConsultantMeeting>(res);
}

export async function cancelConsultantMeeting(
  token: string,
  caseId: string,
  meetingId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/meetings/${meetingId}/cancel`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  return readJsonResponse<{ ok: boolean }>(res);
}

export async function linkConsultantVideoCall(
  token: string,
  caseId: string,
  callId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/cases/${caseId}/link-video-call/${callId}`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  return readJsonResponse<{
    id: string;
    status: string;
    scheduledAt: string | null;
    consultantEngagementId: string | null;
  }>(res);
}

export async function getConsultantVideoLiveKitToken(
  token: string,
  callId: string,
) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/consultant/video-calls/${callId}/livekit-token`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ConsultantLiveKitToken>(res);
}
