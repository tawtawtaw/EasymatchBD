import { setRequestLocale } from "next-intl/server";
import { PrivacyFieldsByLevelPanel } from "@/components/PrivacyFieldsByLevelPanel";

export default async function PrivacyFieldsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyFieldsByLevelPanel />;
}
