import { setRequestLocale } from "next-intl/server";
import { PrivacyFieldsByLevelPanel } from "@/components/PrivacyFieldsByLevelPanel";
import { generatePublicMetadata } from "@/lib/seo";

export const generateMetadata = generatePublicMetadata("/privacy/fields");

export default async function PrivacyFieldsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyFieldsByLevelPanel />;
}
