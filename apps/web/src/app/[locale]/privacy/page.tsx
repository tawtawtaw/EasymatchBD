import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingInfoPage } from "@/components/MarketingInfoPage";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacyPage");

  const sections = ["overview", "levels", "photos", "control"] as const;

  return (
    <MarketingInfoPage
      backHomeLabel={t("backHome")}
      title={t("title")}
      intro={t("intro")}
      sections={sections.map((key) => ({
        title: t(`sections.${key}.title`),
        body: t(`sections.${key}.body`),
      }))}
      cta={{ label: t("fieldsCta"), href: "/privacy/fields" }}
      secondaryCta={{ label: t("termsCta"), href: "/terms" }}
    />
  );
}
