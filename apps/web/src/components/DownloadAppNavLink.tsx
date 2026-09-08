"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { siteNavBrowseLinkClass, type SiteNavLayout } from "@/lib/site-nav-styles";

export function DownloadAppNavLink({
  layout = "inline",
  onNavigate,
}: {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
}) {
  const t = useTranslations("appDownload");

  return (
    <Link
      href="/download"
      className={`${siteNavBrowseLinkClass(layout)}${layout === "inline" ? " lg:hidden" : ""}`}
      onClick={onNavigate}
    >
      {t("nav")}
    </Link>
  );
}
