"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { isOfficerRole } from "@/lib/verification";
import { useStaffAlerts } from "@/components/StaffAlertsProvider";
import { NavCountBadge, navLinkWithBadgeClass } from "@/components/StaffNavBadge";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { SiteNavLayout } from "@/lib/site-nav-styles";

type VerificationNavLinkProps = {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
};

export function VerificationNavLink({
  layout = "inline",
  onNavigate,
}: VerificationNavLinkProps) {
  const t = useTranslations("common");
  const { user, ready } = useAuthSession();
  const { summary } = useStaffAlerts();

  if (!ready || !user || !isOfficerRole(user.role)) return null;

  return (
    <Link
      href="/verification/home"
      className={navLinkWithBadgeClass(layout)}
      onClick={onNavigate}
    >
      {t("verification")}
      <NavCountBadge count={summary.verificationPending} />
    </Link>
  );
}
