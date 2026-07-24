import {
  EASYMATCH_API_URL,
  canAccessAdminProfiles,
  isSuperAdminRole as isSuperAdminRoleShared,
} from "@easymatch/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

export type DropdownOption = {
  id: string;
  category: string;
  value: string;
  label: string;
  labelBn: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DropdownCategoryItem = {
  category: string;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  let data: T & {
    message?: string | string[];
    statusCode?: number;
  };

  if (contentType.includes("application/json")) {
    data = (await res.json()) as typeof data;
  } else {
    const text = (await res.text()).trim();
    if (!res.ok) {
      throw new Error(text || `Request failed (${res.status})`);
    }
    throw new Error("Unexpected response format from server");
  }

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

export function isSuperAdminRole(role: string) {
  return isSuperAdminRoleShared(role);
}

export function canViewAdminProfiles(role: string) {
  return canAccessAdminProfiles(role);
}

export async function getDropdownCategories(token: string) {
  const res = await fetch(`${API_URL}/admin/dropdowns/categories`, {
    headers: authHeaders(token),
  });
  return parseResponse<DropdownCategoryItem[]>(res);
}

export async function getAdminDropdownOptions(token: string, category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`${API_URL}/admin/dropdowns${query}`, {
    headers: authHeaders(token),
  });
  return parseResponse<DropdownOption[]>(res);
}

export async function createDropdownOption(
  token: string,
  data: {
    category: string;
    value: string;
    label: string;
    labelBn?: string;
    sortOrder?: number;
  },
) {
  const res = await fetch(`${API_URL}/admin/dropdowns`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return parseResponse<DropdownOption>(res);
}

export async function updateDropdownOption(
  token: string,
  id: string,
  data: {
    label?: string;
    labelBn?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  const res = await fetch(`${API_URL}/admin/dropdowns/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return parseResponse<DropdownOption>(res);
}

export async function deleteDropdownOption(token: string, id: string) {
  const res = await fetch(`${API_URL}/admin/dropdowns/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return parseResponse<{ deleted: boolean }>(res);
}

export type PrivacyFieldConfig = {
  fieldKey: string;
  section: string;
  isShareable: boolean;
  minPrivacyLevel: number;
  sortOrder: number;
  updatedAt: string;
};

export async function getAdminPrivacyFields(token: string) {
  const res = await fetch(`${API_URL}/admin/privacy-fields`, {
    headers: authHeaders(token),
  });
  return parseResponse<PrivacyFieldConfig[]>(res);
}

export async function updateAdminPrivacyFields(
  token: string,
  fields: Pick<PrivacyFieldConfig, "fieldKey" | "isShareable" | "minPrivacyLevel">[],
) {
  const res = await fetch(`${API_URL}/admin/privacy-fields`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ fields }),
  });
  return parseResponse<PrivacyFieldConfig[]>(res);
}

export type MembershipTariffConfig = {
  id: string;
  plan: string;
  labelEn: string;
  labelBn: string | null;
  priceBdt: string;
  currency: string;
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
  descriptionEn: string | null;
  descriptionBn: string | null;
  updatedAt: string;
};

export async function getAdminMembershipTariffs(token: string) {
  const res = await fetch(`${API_URL}/admin/membership-tariffs`, {
    headers: authHeaders(token),
  });
  return parseResponse<MembershipTariffConfig[]>(res);
}

export async function updateAdminMembershipTariffs(
  token: string,
  tariffs: {
    plan: string;
    labelEn: string;
    labelBn?: string | null;
    priceBdt: number;
    currency?: string;
    durationDays: number;
    isActive: boolean;
    sortOrder: number;
    descriptionEn?: string | null;
    descriptionBn?: string | null;
  }[],
) {
  const res = await fetch(`${API_URL}/admin/membership-tariffs`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ tariffs }),
  });
  return parseResponse<MembershipTariffConfig[]>(res);
}

export type ConsultantTariffConfig = {
  id: string;
  serviceType: string;
  labelEn: string;
  labelBn: string | null;
  priceBdt: string;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  descriptionEn: string | null;
  descriptionBn: string | null;
  updatedAt: string;
};

export async function getAdminConsultantTariffs(token: string) {
  const res = await fetch(`${API_URL}/admin/consultant-tariffs`, {
    headers: authHeaders(token),
  });
  return parseResponse<ConsultantTariffConfig[]>(res);
}

export async function updateAdminConsultantTariffs(
  token: string,
  tariffs: {
    serviceType: string;
    labelEn: string;
    labelBn?: string | null;
    priceBdt: number;
    currency?: string;
    isActive: boolean;
    sortOrder: number;
    descriptionEn?: string | null;
    descriptionBn?: string | null;
  }[],
) {
  const res = await fetch(`${API_URL}/admin/consultant-tariffs`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ tariffs }),
  });
  return parseResponse<ConsultantTariffConfig[]>(res);
}
