import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingInfoPage } from "@/components/MarketingInfoPage";

const SECTION_KEYS = [
  "gateway",
  "encryption",
  "dataHandling",
  "userResponsibilities",
  "support",
] as const;

export default async function PaymentSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("paymentSecurityPage");

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
      effectiveDate={t.has("effectiveDate") ? t("effectiveDate") : undefined}
      sections={sections}
      cta={{ label: t("membershipCta"), href: "/membership" }}
      secondaryCta={{ label: t("contactCta"), href: "/contact" }}
    />
  );
}
