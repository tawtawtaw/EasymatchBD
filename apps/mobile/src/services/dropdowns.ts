import type { DropdownMap } from "../types/dropdowns";
import { apiRequest } from "./api/client";

let cachedDropdowns: DropdownMap | null = null;
let cachedLocale: string | null = null;

export async function getDropdowns(locale = "en"): Promise<DropdownMap> {
  if (cachedDropdowns && cachedLocale === locale) {
    return cachedDropdowns;
  }

  const data = await apiRequest<DropdownMap>(
    `/profiles/dropdowns?locale=${encodeURIComponent(locale)}`,
    { auth: false },
  );

  cachedDropdowns = data;
  cachedLocale = locale;
  return data;
}
