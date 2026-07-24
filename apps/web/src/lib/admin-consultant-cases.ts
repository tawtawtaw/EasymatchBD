import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";
import type { ConsultantCaseItem } from "@/lib/consultant-engagements";
import type { ConsultantCaseDetail } from "@/lib/consultant-case-workflow";

export type ConsultantEngagementStatus =
  | "queued"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AdminConsultantCaseItem = ConsultantCaseItem & {
  assignedConsultantName: string | null;
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listAdminConsultantCases(
  token: string,
  status?: ConsultantEngagementStatus,
) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/consultant/cases${query}`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<AdminConsultantCaseItem[]>(res);
}

export async function getAdminConsultantCase(token: string, caseId: string) {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/consultant/cases/${caseId}`,
    { headers: authHeaders(token) },
  );
  return readJsonResponse<ConsultantCaseDetail>(res);
}
