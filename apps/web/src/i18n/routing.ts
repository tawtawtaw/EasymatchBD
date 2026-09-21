import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "bn"],
  defaultLocale: "en",
  localePrefix: "always",
  // HTML alternates/canonicals in `@/lib/seo` already use SITE_URL (apex).
  // Middleware Link headers reuse the request host and locale-less x-default,
  // which conflicts with those tags and confuses Google canonical selection.
  alternateLinks: false,
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);

export type Locale = (typeof routing.locales)[number];
