import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

function messagesFilePath(locale: string) {
  const fileName = `${locale}.json`;
  const candidates = [
    join(process.cwd(), "messages", fileName),
    join(process.cwd(), "apps/web/messages", fileName),
  ];
  try {
    candidates.unshift(
      join(dirname(fileURLToPath(import.meta.url)), "../../messages", fileName),
    );
  } catch {
    // Bundled runtime may not expose import.meta.url.
  }
  return candidates.find((path) => existsSync(path)) ?? candidates[0];
}

async function loadMessages(locale: string) {
  if (process.env.NODE_ENV === "development") {
    const filePath = messagesFilePath(locale);
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
