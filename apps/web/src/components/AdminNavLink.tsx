"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { canViewAdminProfiles } from "@/lib/admin";
import { useStaffAlerts } from "@/components/StaffAlertsProvider";
import {
  adminNavBadgeCount,
  NavCountBadge,
  navLinkWithBadgeClass,
} from "@/components/StaffNavBadge";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { SiteNavLayout } from "@/lib/site-nav-styles";

type AdminNavLinkProps = {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
};

export function AdminNavLink({ layout = "inline", onNavigate }: AdminNavLinkProps) {
  const t = useTranslations("common");
  const { user, ready } = useAuthSession();
  const { summary } = useStaffAlerts();

  if (!ready || !user || !canViewAdminProfiles(user.role)) return null;

  const badge = adminNavBadgeCount(user.role, summary);

  return (
    <Link href="/admin/home" className={navLinkWithBadgeClass(layout)} onClick={onNavigate}>
      {t("admin")}
      <NavCountBadge count={badge} />
    </Link>
  );
}
