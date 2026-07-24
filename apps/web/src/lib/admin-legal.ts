import { EASYMATCH_API_URL } from "@easymatch/shared";
import type { TermsSection } from "@easymatch/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

export type AdminTermsSchedule = {
  scheduledPublishAt: string;
  scheduledBy: {
    id: string;
    email: string | null;
    phone: string | null;
  } | null;
} | null;

export type AdminTermsState = {
  published: {
    version: string;
    effectiveDateEn: string;
    effectiveDateBn: string;
    sectionsEn: TermsSection[];
    sectionsBn: TermsSection[];
    publishedAt: string;
  };
  draft: {
    version: string;
    effectiveDateEn: string;
    effectiveDateBn: string;
    sectionsEn: TermsSection[];
    sectionsBn: TermsSection[];
  };
  hasDraftChanges: boolean;
  schedule: AdminTermsSchedule;
};

export type TermsAuditEntry = {
  id: string;
  action: "published" | "scheduled" | "schedule_cancelled";
  version: string;
  effectiveDateEn: string | null;
  effectiveDateBn: string | null;
  scheduledFor: string | null;
  performedAt: string;
  performedBy: {
    id: string;
    email: string | null;
    phone: string | null;
  } | null;
};

export type TermsPreview = {
  version: string;
  effectiveDate: string;
  sections: TermsSection[];
  publishedAt: string;
  isDraftPreview?: boolean;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & {
    message?: string | string[];
    statusCode?: number;
  };
  if (!res.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getAdminTermsState(token: string) {
  const res = await fetch(`${API_URL}/admin/legal/terms`, {
    headers: authHeaders(token),
  });
  return parseResponse<AdminTermsState>(res);
}

export async function getAdminTermsPreview(token: string, locale: string) {
  const res = await fetch(
    `${API_URL}/admin/legal/terms/preview?locale=${encodeURIComponent(locale)}`,
    { headers: authHeaders(token) },
  );
  return parseResponse<TermsPreview>(res);
}

export async function getAdminTermsAuditLog(token: string) {
  const res = await fetch(`${API_URL}/admin/legal/terms/audit-log`, {
    headers: authHeaders(token),
  });
  return parseResponse<TermsAuditEntry[]>(res);
}

export async function saveAdminTermsDraft(
  token: string,
  data: AdminTermsState["draft"],
) {
  const res = await fetch(`${API_URL}/admin/legal/terms`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return parseResponse<AdminTermsState>(res);
}

export async function publishAdminTerms(token: string, version?: string) {
  const res = await fetch(`${API_URL}/admin/legal/terms/publish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(version ? { version } : {}),
  });
  return parseResponse<{
    published: boolean;
    version: string;
    publishedAt: string;
  }>(res);
}

export async function scheduleAdminTermsPublish(
  token: string,
  scheduledPublishAt: string,
) {
  const res = await fetch(`${API_URL}/admin/legal/terms/schedule`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ scheduledPublishAt }),
  });
  return parseResponse<AdminTermsState>(res);
}

export async function cancelAdminTermsSchedule(token: string) {
  const res = await fetch(`${API_URL}/admin/legal/terms/cancel-schedule`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<AdminTermsState>(res);
}

export async function discardAdminTermsDraft(token: string) {
  const res = await fetch(`${API_URL}/admin/legal/terms/discard-draft`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseResponse<AdminTermsState>(res);
}

export function formatAdminActor(
  actor: { email: string | null; phone: string | null } | null,
) {
  if (!actor) return "—";
  return actor.email ?? actor.phone ?? "—";
}
