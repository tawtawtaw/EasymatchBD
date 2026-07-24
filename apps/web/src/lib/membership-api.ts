import { EASYMATCH_API_URL } from "@easymatch/shared";
import type { MembershipSnapshot } from "@easymatch/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

export type MembershipPlan = "free" | "gold" | "platinum";

export type SetMembershipResult = {
  subscription: MembershipSnapshot;
  isPaidMember: boolean;
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

export async function setMyMembershipPlan(token: string, plan: MembershipPlan) {
  return parseResponse<SetMembershipResult>(
    await fetch(`${API_URL}/dev/membership`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ plan }),
    }),
  );
}

export async function setAdminMemberPlan(
  token: string,
  userId: string,
  plan: MembershipPlan,
) {
  return parseResponse<SetMembershipResult>(
    await fetch(`${API_URL}/admin/membership/${userId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ plan }),
    }),
  );
}
