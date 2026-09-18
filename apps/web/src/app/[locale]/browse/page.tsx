import { setRequestLocale } from "next-intl/server";
import { PublicBrowseClient } from "./PublicBrowseClient";
import { filtersFromSearchParams } from "@/lib/public-browse-filters";
import { generatePublicMetadata } from "@/lib/seo";

export const generateMetadata = generatePublicMetadata("/browse");

export default async function PublicBrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim()) {
      usp.set(key, value);
    }
  }

  return <PublicBrowseClient initialFilters={filtersFromSearchParams(usp)} />;
}
