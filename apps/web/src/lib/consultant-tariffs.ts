import type { ConsultantTariff } from "@easymatch/shared";
import { dedupeRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

export type { ConsultantTariff };

export async function getConsultantTariffs(): Promise<ConsultantTariff[]> {
  return dedupeRequest(
    "consultant-tariffs",
    async () => {
      const res = await apiFetch(`${getApiBaseUrl()}/consultant-tariffs`);
      return readJsonResponse<ConsultantTariff[]>(res);
    },
    300_000,
  );
}
