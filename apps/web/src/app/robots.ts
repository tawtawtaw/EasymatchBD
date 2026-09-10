import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

const PRIVATE_PREFIXES = [
  "/admin",
  "/auth",
  "/profile",
  "/discovery",
  "/connections",
  "/messages",
  "/video-calls",
  "/video",
  "/verification",
  "/consultant",
  "/complaints",
  "/home",
  "/mobile",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = PRIVATE_PREFIXES.flatMap((prefix) =>
    routing.locales.map((locale) => `/${locale}${prefix}`),
  );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
