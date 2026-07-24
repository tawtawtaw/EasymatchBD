"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { isStaffRole } from "@easymatch/shared";
import { useAuthSession } from "@/hooks/use-auth-session";
import { siteNavLinkClass, type SiteNavLayout } from "@/lib/site-nav-styles";

type ConnectionsNavLinkProps = {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
};

export function ConnectionsNavLink({
  layout = "inline",
  onNavigate,
}: ConnectionsNavLinkProps) {
  const t = useTranslations("common");
  const { user, ready } = useAuthSession();

  if (!ready || !user || isStaffRole(user.role)) return null;

  return (
    <Link href="/connections" className={siteNavLinkClass(layout)} onClick={onNavigate}>
      {t("connections")}
    </Link>
  );
}
