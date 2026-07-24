"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { UserRole } from "@easymatch/shared";
import { useStaffAlerts } from "@/components/StaffAlertsProvider";
import {
  consultantNavBadgeCount,
  NavCountBadge,
  navLinkWithBadgeClass,
} from "@/components/StaffNavBadge";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { SiteNavLayout } from "@/lib/site-nav-styles";

type ConsultantNavLinkProps = {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
};

export function ConsultantNavLink({
  layout = "inline",
  onNavigate,
}: ConsultantNavLinkProps) {
  const t = useTranslations("common");
  const { user, ready } = useAuthSession();
  const { summary } = useStaffAlerts();

  if (
    !ready ||
    !user ||
    (user.role !== UserRole.MARRIAGE_CONSULTANT && user.role !== UserRole.SUPER_ADMIN)
  ) {
    return null;
  }

  const badge = consultantNavBadgeCount(summary);

  return (
    <Link
      href="/consultant/home"
      className={navLinkWithBadgeClass(layout)}
      onClick={onNavigate}
    >
      {t("consultant")}
      <NavCountBadge count={badge} />
    </Link>
  );
}
