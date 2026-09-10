import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

/** Public marketing and legal pages only — not signed-in or admin routes. */
const PUBLIC_PATHS: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/browse", changeFrequency: "daily", priority: 0.9 },
  { path: "/membership", changeFrequency: "weekly", priority: 0.8 },
  { path: "/download", changeFrequency: "weekly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy/fields", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.5 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.4 },
  { path: "/refund", changeFrequency: "yearly", priority: 0.4 },
  { path: "/payment-security", changeFrequency: "yearly", priority: 0.4 },
  { path: "/service-delivery", changeFrequency: "yearly", priority: 0.4 },
];

function localizedUrl(locale: string, path: string): string {
  return `${SITE_URL}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.map(({ path, changeFrequency, priority }) => {
    const languages: Record<string, string> = {
      "x-default": localizedUrl(routing.defaultLocale, path),
    };
    for (const locale of routing.locales) {
      languages[locale] = localizedUrl(locale, path);
    }

    return {
      url: localizedUrl(routing.defaultLocale, path),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    };
  });
}
