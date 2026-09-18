import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingInfoPage } from "@/components/MarketingInfoPage";
import { generatePublicMetadata } from "@/lib/seo";

export const generateMetadata = generatePublicMetadata("/privacy");

const SECTION_KEYS = [
  "informationWeCollect",
  "howWeUse",
  "sharingDisclosure",
  "paymentSecurity",
  "overview",
  "levels",
  "photos",
  "control",
] as const;

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacyPage");

  const sections = SECTION_KEYS.map((key) => {
    const title = t(`sections.${key}.title`);
    const body = t.has(`sections.${key}.body`)
      ? t(`sections.${key}.body`)
      : undefined;
    const rawBullets = t.has(`sections.${key}.bullets`)
      ? t.raw(`sections.${key}.bullets`)
      : null;
    const bullets = Array.isArray(rawBullets)
      ? (rawBullets as string[])
      : undefined;
    return { title, body, bullets };
  });

  return (
    <MarketingInfoPage
      backHomeLabel={t("backHome")}
      title={t("title")}
      intro={t("intro")}
      effectiveDate={t("effectiveDate")}
      sections={sections}
      cta={{ label: t("fieldsCta"), href: "/privacy/fields" }}
      secondaryCta={{ label: t("termsCta"), href: "/terms" }}
    />
  );
}
