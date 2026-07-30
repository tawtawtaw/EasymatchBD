import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingInfoPage } from "@/components/MarketingInfoPage";
import { ABOUT_COMPANY, phoneTelHref } from "@/lib/about-company";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aboutPage");

  const sections = ["mission", "verification", "families"] as const;

  const companyRows = [
    {
      label: t("company.fields.businessName"),
      value: ABOUT_COMPANY.businessName,
    },
    {
      label: t("company.fields.founder"),
      value: ABOUT_COMPANY.founder,
    },
    {
      label: t("company.fields.businessType"),
      value: t(`company.values.businessType.${ABOUT_COMPANY.businessTypeKey}`),
    },
    {
      label: t("company.fields.tradeLicenceNo"),
      value: ABOUT_COMPANY.tradeLicenceNo,
    },
    {
      label: t("company.fields.licensingAuthority"),
      value: t(`company.values.licensingAuthority.${ABOUT_COMPANY.licensingAuthorityKey}`),
    },
    {
      label: t("company.fields.tin"),
      value: t(`company.values.tin.${ABOUT_COMPANY.tinPlaceholderKey}`),
    },
    {
      label: t("company.fields.dbid"),
      value: t(`company.values.dbid.${ABOUT_COMPANY.dbidPlaceholderKey}`),
    },
    {
      label: t("company.fields.officeAddress"),
      value: t(`company.values.address.${ABOUT_COMPANY.officeAddressKey}`),
    },
    {
      label: t("company.fields.website"),
      value: ABOUT_COMPANY.website.replace(/^https:\/\//, ""),
      href: ABOUT_COMPANY.website,
      external: true,
    },
    {
      label: t("company.fields.email"),
      value: ABOUT_COMPANY.email,
      href: `mailto:${ABOUT_COMPANY.email}`,
    },
    {
      label: t("company.fields.businessMobile"),
      value: ABOUT_COMPANY.businessMobile,
      href: phoneTelHref(ABOUT_COMPANY.businessMobile),
    },
    {
      label: t("company.fields.customerSupport"),
      value: ABOUT_COMPANY.customerSupport,
      href: phoneTelHref(ABOUT_COMPANY.customerSupport),
    },
    {
      label: t("company.fields.facebook"),
      value: t("company.linkLabels.facebook"),
      href: ABOUT_COMPANY.facebook,
      external: true,
    },
    {
      label: t("company.fields.youtube"),
      value: t("company.linkLabels.youtube"),
      href: ABOUT_COMPANY.youtube,
      external: true,
    },
  ];

  return (
    <MarketingInfoPage
      backHomeLabel={t("backHome")}
      title={t("title")}
      intro={t("intro")}
      introParagraphs={[t("intro"), t("introLicensed")]}
      sections={sections.map((key) => ({
        title: t(`sections.${key}.title`),
        body: t(`sections.${key}.body`),
      }))}
      companyDetails={{
        title: t("company.title"),
        rows: companyRows,
      }}
      cta={{ label: t("browseCta"), href: "/browse" }}
    />
  );
}
