import type { AppLocale } from "../lib/locale";
import type { BiodataBootstrap, BiodataExportPayload } from "../types/biodata-export";
import { apiRequest } from "./api/client";

export async function getBiodataBootstrap(level = 0, locale: AppLocale = "en") {
  return apiRequest<BiodataBootstrap>(
    `/auth/me/biodata-bootstrap?level=${level}&locale=${locale}`,
  );
}

export async function fetchBiodataExport(level: number) {
  return apiRequest<BiodataExportPayload>(
    `/profiles/me/biodata-export?level=${level}`,
  );
}
