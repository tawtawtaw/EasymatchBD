"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { isStaffRole } from "@easymatch/shared";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMessageUnreadCount } from "@/hooks/use-message-unread-count";
import { siteNavLinkClass, type SiteNavLayout } from "@/lib/site-nav-styles";

type MessagesNavLinkProps = {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
};

export function MessagesNavLink({
  layout = "inline",
  onNavigate,
}: MessagesNavLinkProps) {
  const t = useTranslations("common");
  const { user, ready } = useAuthSession();
  const { unreadCount } = useMessageUnreadCount();

  if (!ready || !user || isStaffRole(user.role)) return null;

  const className =
    layout === "stack"
      ? `${siteNavLinkClass("stack")} relative inline-flex items-center gap-2`
      : "relative text-sm font-semibold text-zinc-800 hover:text-rose-800";

  return (
    <Link href="/messages" className={className} onClick={onNavigate}>
      {t("messages")}
      {unreadCount > 0 ? (
        <span className="inline-flex min-w-[1rem] items-center justify-center rounded-full bg-rose-800 px-1 text-[10px] font-bold leading-4 text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
