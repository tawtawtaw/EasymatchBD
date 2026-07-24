"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { VerificationBadge } from "@/components/VerificationBadge";
import { GenderProfilePlaceholder } from "@/components/GenderProfilePlaceholder";
import {
  displayPublicName,
  type PublicBrowseListItem,
} from "@/lib/public-browse";
import {
  formatBiodataFieldValue,
  lookupDropdownLabel,
} from "@/lib/biodata-display";
import type { DropdownMap } from "@/lib/api";

type PublicBrowseProfileCardProps = {
  item: PublicBrowseListItem;
  dropdowns?: DropdownMap;
};

function previewLine(
  personal: Record<string, unknown>,
  dropdowns: DropdownMap,
  locale: string,
) {
  const fields: Array<{ key: string; value: unknown }> = [
    { key: "marital_status", value: personal.marital_status },
    { key: "religion", value: personal.religion },
    { key: "current_district", value: personal.current_district },
    { key: "occupation", value: personal.occupation },
  ];

  const parts = fields
    .map(({ key, value }) => {
      if (value === null || value === undefined || value === "") return null;
      return formatBiodataFieldValue(key, value, {
        locale,
        dropdowns,
        personal,
      });
    })
    .filter((part): part is string => Boolean(part));

  return parts.slice(0, 3).join(" · ");
}

function genderLabel(
  gender: string,
  dropdowns: DropdownMap,
  locale: string,
) {
  return (
    lookupDropdownLabel(dropdowns, "gender", gender) ??
    formatBiodataFieldValue("gender", gender, { locale, dropdowns })
  );
}

export function PublicBrowseProfileCard({
  item,
  dropdowns = {},
}: PublicBrowseProfileCardProps) {
  const locale = useLocale();
  const t = useTranslations("publicBrowse");
  const name = displayPublicName(item.personal);
  const preview = previewLine(item.personal, dropdowns, locale);
  const gender =
    typeof item.personal.gender === "string" ? item.personal.gender : null;

  return (
    <article className="flex gap-3 rounded-xl border border-rose-100 bg-white p-3 shadow-sm transition hover:border-rose-200 hover:shadow-md">
      <GenderProfilePlaceholder gender={gender} className="h-12 w-12 sm:h-14 sm:w-14" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-zinc-900">
              {name ?? t("anonymousMember")}
            </h2>
            <p className="text-[11px] text-zinc-500">
              {t("profileCode", { code: item.profileCode })}
            </p>
          </div>
          <VerificationBadge
            isVerified={item.media.isVerified}
            verifiedOnBehalf={item.media.verifiedOnBehalf}
            memberNidVerified={item.media.memberNidVerified}
            className="!px-1.5 !py-0 !text-[10px]"
          />
        </div>
        {gender ? (
          <p className="text-[11px] text-zinc-600">
            {genderLabel(gender, dropdowns, locale)}
          </p>
        ) : null}
        {preview ? (
          <p className="line-clamp-2 text-xs text-zinc-600">{preview}</p>
        ) : null}
        {typeof item.personal.introduction === "string" &&
        item.personal.introduction.trim() ? (
          <p className="line-clamp-2 text-[11px] text-zinc-500">
            {item.personal.introduction}
          </p>
        ) : null}
        <Link
          href={`/browse/${encodeURIComponent(item.profileCode)}`}
          className="mt-0.5 inline-flex w-fit rounded-md bg-rose-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
        >
          {t("viewBiodata")}
        </Link>
      </div>
    </article>
  );
}
