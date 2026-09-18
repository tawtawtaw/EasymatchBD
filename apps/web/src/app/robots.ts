import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";
import { SEO_PRIVATE_PREFIXES } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const disallow = SEO_PRIVATE_PREFIXES.flatMap((prefix) =>
    routing.locales.map((locale) => `/${locale}${prefix}`),
  );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
