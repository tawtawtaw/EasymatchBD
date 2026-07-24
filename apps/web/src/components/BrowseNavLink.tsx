"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuthSession } from "@/hooks/use-auth-session";
import { isStaffRole } from "@easymatch/shared";
import { siteNavBrowseLinkClass, type SiteNavLayout } from "@/lib/site-nav-styles";

type BrowseNavLinkProps = {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
};

export function BrowseNavLink({ layout = "inline", onNavigate }: BrowseNavLinkProps) {
  const t = useTranslations("publicBrowse");
  const { loggedIn, user, ready } = useAuthSession();

  if (ready && loggedIn && user && !isStaffRole(user.role)) {
    return null;
  }

  return (
    <Link
      href="/browse"
      className={siteNavBrowseLinkClass(layout)}
      onClick={onNavigate}
    >
      {t("navBrowse")}
    </Link>
  );
}
