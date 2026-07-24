"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  PROFILE_ACCOUNT_STATUS_HREF,
  scrollToProfileAccountStatus,
} from "@/lib/profile-pause";

type Props = {
  className?: string;
};

const actionClassName =
  "mt-2 inline-flex text-sm font-semibold text-amber-950 underline hover:text-amber-900";

export function ProfilePausedBanner({ className = "" }: Props) {
  const t = useTranslations("profile.accountStatus");
  const pathname = usePathname();
  const onProfilePage = pathname === "/profile";

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
      role="status"
    >
      <p className="font-semibold">{t("pausedBannerTitle")}</p>
      <p className="mt-1 text-amber-900">{t("pausedBannerBody")}</p>
      {onProfilePage ? (
        <button
          type="button"
          onClick={scrollToProfileAccountStatus}
          className={actionClassName}
        >
          {t("pausedBannerAction")}
        </button>
      ) : (
        <Link href={PROFILE_ACCOUNT_STATUS_HREF} className={actionClassName}>
          {t("pausedBannerAction")}
        </Link>
      )}
    </div>
  );
}
