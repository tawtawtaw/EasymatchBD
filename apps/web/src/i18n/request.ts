import { readFile } from "fs/promises";
import { join } from "path";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

async function loadMessages(locale: string) {
  if (process.env.NODE_ENV === "development") {
    const filePath = join(process.cwd(), "messages", `${locale}.json`);
    return JSON.parse(await readFile(filePath, "utf8")) as Record<
      string,
      unknown
    >;
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
