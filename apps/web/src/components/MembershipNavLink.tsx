"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { isStaffRole } from "@easymatch/shared";
import { useAuthSession } from "@/hooks/use-auth-session";
import { membershipFromSession } from "@/lib/membership";
import { type SiteNavLayout } from "@/lib/site-nav-styles";

type MembershipNavLinkProps = {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
};

export function MembershipNavLink({
  layout = "inline",
  onNavigate,
}: MembershipNavLinkProps) {
  const t = useTranslations("common");
  const { user, ready } = useAuthSession();
  const isPaid = membershipFromSession(user);

  if (!ready || !user || isStaffRole(user.role)) return null;

  const colorClass = isPaid
    ? "text-zinc-800 hover:text-rose-800"
    : "text-amber-800 hover:text-amber-900";
  const className =
    layout === "stack"
      ? `block rounded-lg px-2 py-2.5 text-sm font-semibold hover:bg-zinc-50 ${colorClass}`
      : `text-sm font-semibold ${colorClass}`;

  return (
    <Link href="/membership" className={className} onClick={onNavigate}>
      {t("membership")}
    </Link>
  );
}
