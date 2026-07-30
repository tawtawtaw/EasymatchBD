import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingInfoPage } from "@/components/MarketingInfoPage";

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cookiesPage");

  const sections = [
    "overview",
    "essential",
    "preferences",
    "thirdParty",
    "control",
    "updates",
  ] as const;

  return (
    <MarketingInfoPage
      backHomeLabel={t("backHome")}
      title={t("title")}
      intro={t("intro")}
      sections={sections.map((key) => ({
        title: t(`sections.${key}.title`),
        body: t(`sections.${key}.body`),
      }))}
      cta={{ label: t("privacyCta"), href: "/privacy" }}
      secondaryCta={{ label: t("contactCta"), href: "/contact" }}
    />
  );
}
