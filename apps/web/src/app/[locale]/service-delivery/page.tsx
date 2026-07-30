import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingInfoPage } from "@/components/MarketingInfoPage";
import type { ServiceDeliveryTimelineRow } from "@/components/ServiceDeliveryTimelineTable";

const TIMELINE_ROW_KEYS = [
  "freeRegistration",
  "biodataReview",
  "paidMembership",
  "profileVerification",
  "interestProcessing",
  "familyContact",
] as const;

const SECTION_KEYS = ["digitalService", "support"] as const;

export default async function ServiceDeliveryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("serviceDeliveryPage");

  const rows: ServiceDeliveryTimelineRow[] = TIMELINE_ROW_KEYS.map((key) => ({
    service: t(`timelineTable.rows.${key}.service`),
    timeline: t(`timelineTable.rows.${key}.timeline`),
    remarks: t(`timelineTable.rows.${key}.remarks`),
  }));

  const sections = SECTION_KEYS.map((key) => ({
    title: t(`sections.${key}.title`),
    body: t(`sections.${key}.body`),
  }));

  return (
    <MarketingInfoPage
      backHomeLabel={t("backHome")}
      title={t("title")}
      intro={t("intro")}
      deliveryTimeline={{
        title: t("timelineTable.title"),
        columns: {
          service: t("timelineTable.columns.service"),
          timeline: t("timelineTable.columns.timeline"),
          remarks: t("timelineTable.columns.remarks"),
        },
        rows,
      }}
      sections={sections}
      cta={{ label: t("membershipCta"), href: "/membership" }}
      secondaryCta={{ label: t("refundCta"), href: "/refund" }}
    />
  );
}
