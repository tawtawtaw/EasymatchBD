"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { isStaffRole } from "@easymatch/shared";
import { useAuthSession } from "@/hooks/use-auth-session";
import { siteNavLinkClass, type SiteNavLayout } from "@/lib/site-nav-styles";

type DiscoveryNavLinkProps = {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
};

export function DiscoveryNavLink({
  layout = "inline",
  onNavigate,
}: DiscoveryNavLinkProps) {
  const t = useTranslations("common");
  const { user, ready } = useAuthSession();

  if (!ready || !user || isStaffRole(user.role)) return null;

  return (
    <Link href="/discovery" className={siteNavLinkClass(layout)} onClick={onNavigate}>
      {t("discovery")}
    </Link>
  );
}
