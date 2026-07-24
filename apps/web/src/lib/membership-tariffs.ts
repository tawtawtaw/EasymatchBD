import type { MembershipTariff } from "@easymatch/shared";
import { dedupeRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

export type { MembershipTariff };

export async function getMembershipTariffs(): Promise<MembershipTariff[]> {
  return dedupeRequest(
    "membership-tariffs",
    async () => {
      const res = await apiFetch(`${getApiBaseUrl()}/membership/tariffs`);
      return readJsonResponse<MembershipTariff[]>(res);
    },
    300_000,
  );
}
