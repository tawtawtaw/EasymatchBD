import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

/** Paths (after the locale prefix) that should not appear in Google. */
export const SEO_PRIVATE_PREFIXES = [
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
  "/membership/payment",
] as const;

/** `metadata.pages.*` keys keyed by path after the locale prefix. */
const PUBLIC_PAGE_META_KEYS: Record<string, string> = {
  "": "home",
  "/browse": "browse",
  "/membership": "membership",
  "/download": "download",
  "/about": "about",
  "/contact": "contact",
  "/privacy": "privacy",
  "/privacy/fields": "privacyFields",
  "/terms": "terms",
  "/cookies": "cookies",
  "/refund": "refund",
  "/payment-security": "paymentSecurity",
  "/service-delivery": "serviceDelivery",
};

export function localeAndRest(pathname: string): {
  locale: string | null;
  rest: string;
} {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (maybeLocale && routing.locales.includes(maybeLocale as "en" | "bn")) {
    const rest = `/${segments.slice(1).join("/")}`.replace(/\/$/, "");
    return { locale: maybeLocale, rest: rest === "/" ? "" : rest };
  }
  const rest = `/${segments.join("/")}`.replace(/\/$/, "");
  return { locale: null, rest: rest === "/" ? "" : rest };
}

export function isSeoPrivatePath(pathname: string): boolean {
  const { rest } = localeAndRest(pathname);
  const path = rest || "";
  return SEO_PRIVATE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function canonicalUrl(locale: string, rest: string): string {
  return `${SITE_URL}/${locale}${rest}`;
}

export function languageAlternates(rest: string): Record<string, string> {
  return {
    "x-default": canonicalUrl(routing.defaultLocale, rest),
    en: canonicalUrl("en", rest),
    bn: canonicalUrl("bn", rest),
  };
}

export const privatePageMetadata: Metadata = {
  robots: { index: false, follow: false },
};

export function publicPathMetadata(
  locale: string,
  rest: string,
  options?: { title?: string; description?: string },
): Metadata {
  const title = options?.title;
  const description = options?.description;
  return {
    // `absolute` prevents the locale layout default title from winning.
    ...(title ? { title: { absolute: title } } : {}),
    ...(description ? { description } : {}),
    robots: { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl(locale, rest),
      languages: languageAlternates(rest),
    },
    openGraph: {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      url: canonicalUrl(locale, rest),
      locale: locale === "bn" ? "bn_BD" : "en_US",
      siteName: "EasymatchBD",
      type: "website",
    },
  };
}

export function generatePublicMetadata(rest: string) {
  return async ({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> => {
    const { locale } = await params;
    const pageKey = PUBLIC_PAGE_META_KEYS[rest] ?? "home";
    const t = await getTranslations({ locale, namespace: "metadata" });
    return publicPathMetadata(locale, rest, {
      title: t(`pages.${pageKey}.title`),
      description: t(`pages.${pageKey}.description`),
    });
  };
}

export function localeSeoMetadata(options: {
  locale: string;
  pathname: string;
  title: string;
  description: string;
}): Metadata {
  const { rest } = localeAndRest(options.pathname);
  const privatePage = isSeoPrivatePath(options.pathname);

  return {
    metadataBase: new URL(SITE_URL),
    title: options.title,
    description: options.description,
    robots: privatePage
      ? { index: false, follow: false }
      : { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl(options.locale, rest),
      languages: languageAlternates(rest),
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url: canonicalUrl(options.locale, rest),
      locale: options.locale === "bn" ? "bn_BD" : "en_US",
      siteName: "EasymatchBD",
      type: "website",
    },
  };
}
