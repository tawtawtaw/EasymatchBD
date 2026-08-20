"use client";

import { Fragment, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ageFromDateOfBirth } from "@easymatch/shared";
import { Link } from "@/i18n/routing";
import { DiscoveryListItem, sendDiscoveryInterest } from "@/lib/discovery";
import { discoveryCardTransitionName } from "@/lib/discovery-grid-transition";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ProfileBookmarkButton } from "@/components/ProfileBookmarkButton";
import { GenderProfilePlaceholder } from "@/components/GenderProfilePlaceholder";
import { resolveMemberDisplayName } from "@/lib/member-display";
import { formatBiodataFieldValue } from "@/lib/biodata-display";
import { useDropdowns } from "@/lib/use-dropdowns";
import type { DropdownMap } from "@/lib/api";

type DiscoveryProfileCardProps = {
  token: string;
  item: DiscoveryListItem;
  isPaid?: boolean;
  onLeave?: (profileCode: string, reason: "pass" | "interest") => void;
  onActionError?: (message: string) => void;
};

/** Matches the palette GenderProfilePlaceholder already uses for the avatar. */
const GENDER_BORDER: Record<string, string> = {
  male: "border-sky-200 hover:border-sky-300",
  female: "border-rose-200 hover:border-rose-300",
};

const NEUTRAL_BORDER = "border-zinc-200 hover:border-zinc-300";

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

function readValue(personal: Record<string, unknown>, key: string) {
  const value = personal[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function profileFacts(
  personal: Record<string, unknown>,
  age: number | null | undefined,
  dropdowns: DropdownMap,
  locale: string,
  t: ReturnType<typeof useTranslations<"discovery">>,
) {
  // The API derives age so it survives date_of_birth being privacy-gated, but
  // fall back for anything served by an older build.
  const dateOfBirth = readValue(personal, "date_of_birth");
  const resolvedAge =
    age ?? (dateOfBirth ? ageFromDateOfBirth(dateOfBirth) : null);

  const coded = (label: string, key: string) => {
    const value = readValue(personal, key);
    if (!value) return null;
    return {
      label,
      value: formatBiodataFieldValue(key, value, { locale, dropdowns, personal }),
    };
  };

  return [
    coded(t("cardProfession"), "occupation"),
    coded(t("cardEducation"), "highest_degree"),
    resolvedAge != null
      ? { label: t("cardAge"), value: String(resolvedAge) }
      : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);
}

export function DiscoveryProfileCard({
  token,
  item,
  isPaid = false,
  onLeave,
  onActionError,
}: DiscoveryProfileCardProps) {
  const locale = useLocale();
  const t = useTranslations("discovery");
  const dropdowns = useDropdowns(locale);
  const [busy, setBusy] = useState(false);
  const name = displayName(item.personal, item.profileCode, t);
  const gender =
    typeof item.personal.gender === "string" ? item.personal.gender : null;
  const facts = profileFacts(item.personal, item.age, dropdowns, locale, t);
  // Privacy hides the name at low levels, in which case the heading is already
  // the profile code and repeating it below just says the same thing twice.
  const showProfileCode = name !== t("profileRef", { code: item.profileCode });

  async function handleInterest() {
    if (!onLeave || busy) return;
    setBusy(true);
    try {
      await sendDiscoveryInterest(token, item.profileCode);
      onLeave(item.profileCode, "interest");
    } catch (err) {
      onActionError?.(
        err instanceof Error ? err.message : t("actions.error"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={`flex gap-3 rounded-xl border-2 bg-white p-3 shadow-sm transition hover:shadow-md ${
        (gender && GENDER_BORDER[gender]) || NEUTRAL_BORDER
      }`}
      style={
        {
          viewTransitionName: discoveryCardTransitionName(item.profileCode),
        } as CSSProperties
      }
    >
      <GenderProfilePlaceholder gender={gender} className="h-12 w-12 sm:h-14 sm:w-14" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-zinc-900">{name}</h2>
            {showProfileCode ? (
              <p className="text-[11px] text-zinc-500">
                {t("profileCodeLabel", { code: item.profileCode })}
              </p>
            ) : null}
          </div>
          <VerificationBadge
            isVerified={item.media.isVerified}
            verifiedOnBehalf={item.media.verifiedOnBehalf}
            memberNidVerified={item.media.memberNidVerified}
            className="!px-1.5 !py-0 !text-[10px]"
          />
        </div>
        {item.compatibility.totalCriteria > 0 ? (
          <p className="w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            {t("cardMatch", {
              score: item.compatibility.score,
              matched: item.compatibility.matchedCount,
              total: item.compatibility.totalCriteria,
            })}
          </p>
        ) : null}
        {facts.length > 0 ? (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-[11px] leading-5">
            {facts.map((fact) => (
              <Fragment key={fact.label}>
                <dt className="text-zinc-500">{fact.label}</dt>
                <dd className="truncate font-medium text-zinc-800">{fact.value}</dd>
              </Fragment>
            ))}
          </dl>
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
        {onLeave && item.relationshipStatus === "none" ? (
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onLeave(item.profileCode, "pass")}
              className="inline-flex flex-1 justify-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {t("passProfile")}
            </button>
            {isPaid ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleInterest()}
                className="inline-flex flex-1 justify-center rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-60"
              >
                {t("expressInterest")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
