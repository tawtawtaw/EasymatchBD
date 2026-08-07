import { readFile } from "fs/promises";
import { join } from "path";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

async function loadMessages(locale: string) {
  if (process.env.NODE_ENV === "development") {
    const filePath = join(process.cwd(), "messages", `${locale}.json`);
    const raw = await readFile(filePath, "utf8");
    if (!raw.trim()) {
      return (await import(`../../messages/${locale}.json`)).default;
    }
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return (await import(`../../messages/${locale}.json`)).default;
    }
  }

  return (await import(`../../messages/${locale}.json`)).default;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "en" | "bn")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
