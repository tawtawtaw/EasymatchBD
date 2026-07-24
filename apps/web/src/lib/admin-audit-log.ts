import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

export type StaffActivityCategory =
  | "admin"
  | "verification"
  | "consultant"
  | "complaints";

export type StaffActivityLogItem = {
  id: string;
  actorId: string;
  actorRole: string;
  actorName: string | null;
  category: StaffActivityCategory;
  action: string;
  summary: string;
  httpMethod: string | null;
  path: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  expiresAt: string;
};

export type StaffActivityLogPage = {
  items: StaffActivityLogItem[];
  nextCursor: string | null;
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listAdminAuditLog(
  token: string,
  options?: {
    category?: StaffActivityCategory;
    actorId?: string;
    limit?: number;
    cursor?: string;
  },
) {
  const params = new URLSearchParams();
  if (options?.category) params.set("category", options.category);
  if (options?.actorId) params.set("actorId", options.actorId);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await apiFetch(`${getApiBaseUrl()}/admin/audit-log${query}`, {
    headers: authHeaders(token),
  });
  return readJsonResponse<StaffActivityLogPage>(res);
}
