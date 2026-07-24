"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { DiscoveryListItem } from "@/lib/discovery";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ProfileBookmarkButton } from "@/components/ProfileBookmarkButton";
import { GenderProfilePlaceholder } from "@/components/GenderProfilePlaceholder";
import { resolveMemberDisplayName } from "@/lib/member-display";

type DiscoveryProfileCardProps = {
  token: string;
  item: DiscoveryListItem;
};

function displayName(
  personal: Record<string, unknown>,
  profileCode: string,
  t: ReturnType<typeof useTranslations<"discovery">>,
) {
  return resolveMemberDisplayName(
    {
      fullName:
        typeof personal.full_name === "string" ? personal.full_name : null,
      profileCode,
    },
    {
      profileRef: (code) => t("profileRef", { code }),
      anonymous: t("member"),
    },
  );
}

export function DiscoveryProfileCard({ item }: DiscoveryProfileCardProps) {
  const t = useTranslations("discovery");
  const tp = useTranslations("privacy");
  const name = displayName(item.personal, item.profileCode, t);
  const gender =
    typeof item.personal.gender === "string" ? item.personal.gender : null;

  return (
    <article className="flex gap-3 rounded-xl border border-rose-100/80 bg-white p-3 shadow-sm transition hover:border-rose-200 hover:shadow-md">
      <GenderProfilePlaceholder gender={gender} className="h-12 w-12 sm:h-14 sm:w-14" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-zinc-900">{name}</h2>
            <p className="text-[11px] text-zinc-500">
              {t("profileCodeLabel", { code: item.profileCode })}
            </p>
          </div>
          <VerificationBadge
            isVerified={item.media.isVerified}
            verifiedOnBehalf={item.media.verifiedOnBehalf}
            memberNidVerified={item.media.memberNidVerified}
            className="!px-1.5 !py-0 !text-[10px]"
          />
        </div>
        {item.compatibility.totalCriteria > 0 ? (
          <p className="text-[11px] font-semibold text-emerald-800">
            {t("compatibilityScore", { score: item.compatibility.score })}
          </p>
        ) : null}
        <p className="text-[11px] text-zinc-500">
          {t("privacyLevel", {
            level: item.viewerPrivacyLevel,
            label: tp(String(item.viewerPrivacyLevel)),
          })}
        </p>
        {item.hiddenFieldCount > 0 ? (
          <p className="text-[11px] text-amber-800">
            {t("hiddenFields", { count: item.hiddenFieldCount })}
          </p>
        ) : null}
        <div className="mt-0.5 flex flex-wrap gap-2">
          <ProfileBookmarkButton
            profileId={item.profileId}
            profileCode={item.profileCode}
            isBookmarked={item.isBookmarked ?? false}
            compact
          />
          <Link
            href={`/discovery/${item.profileCode}`}
            className="inline-flex flex-1 justify-center rounded-md bg-rose-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-900"
          >
            {t("viewProfile")}
          </Link>
        </div>
      </div>
    </article>
  );
}
