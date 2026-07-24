export type AppLocale = "en" | "bn";

export const DEFAULT_APP_LOCALE: AppLocale = "bn";

export const APP_LOCALES: AppLocale[] = ["bn", "en"];

export function normalizeLocale(value: string | null | undefined): AppLocale {
  if (value?.toLowerCase().startsWith("bn")) return "bn";
  if (value?.toLowerCase().startsWith("en")) return "en";
  return DEFAULT_APP_LOCALE;
}
