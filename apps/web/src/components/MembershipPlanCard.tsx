"use client";

import type { ReactNode } from "react";
import {
  formatMembershipOfferUntilDate,
  formatTariffPriceBdt,
  isMembershipDiscountActive,
  membershipDiscountLabel,
  membershipDiscountSavingsBdt,
  membershipEffectivePriceBdt,
  type MembershipTariff,
} from "@easymatch/shared";

type Props = {
  tariff: MembershipTariff;
  locale: string;
  durationText: string;
  priceLabel: (price: string) => string;
  saveLabel: (amount: string) => string;
  offerUntilLabel: (date: string) => string;
  limitedOfferLabel: string;
  popularLabel: string;
  bestValueLabel: string;
  children?: ReactNode;
};

const THEMES = {
  gold: {
    card: "relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[0_12px_28px_rgba(180,83,9,0.16)]",
    bar: "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400",
    badge: "bg-amber-100 text-amber-900",
    title: "text-amber-950",
    price: "text-amber-900",
  },
  platinum: {
    card: "relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-rose-50 p-5 shadow-[0_12px_28px_rgba(136,19,55,0.16)]",
    bar: "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-700",
    badge: "bg-violet-100 text-violet-900",
    title: "text-violet-950",
    price: "text-rose-900",
  },
} as const;

function planTheme(plan: string) {
  return plan === "platinum" ? THEMES.platinum : THEMES.gold;
}

export function MembershipPlanCard({
  tariff,
  locale,
  durationText,
  priceLabel,
  saveLabel,
  offerUntilLabel,
  limitedOfferLabel,
  popularLabel,
  bestValueLabel,
  children,
}: Props) {
  const theme = planTheme(tariff.plan);
  const onSale = isMembershipDiscountActive(tariff);
  const effectivePrice = formatTariffPriceBdt(membershipEffectivePriceBdt(tariff));
  const savings = membershipDiscountSavingsBdt(tariff);
  const offerName =
    membershipDiscountLabel(tariff, locale) ?? limitedOfferLabel;
  const untilDate = formatMembershipOfferUntilDate(tariff.discountEndsAt, locale);
  const planBadge = tariff.plan === "platinum" ? bestValueLabel : popularLabel;
  const description =
    locale === "bn" && tariff.descriptionBn
      ? tariff.descriptionBn
      : tariff.descriptionEn;

  return (
    <article className={theme.card}>
      <div className={theme.bar} />
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${theme.badge}`}
        >
          {planBadge}
        </span>
        {onSale ? (
          <span className="inline-flex rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            {offerName}
          </span>
        ) : null}
      </div>
      <h3 className={`mt-3 text-lg font-bold ${theme.title}`}>
        {locale === "bn" && tariff.labelBn ? tariff.labelBn : tariff.labelEn}
      </h3>
      {onSale ? (
        <p className="mt-3 text-sm text-zinc-500 line-through">
          {priceLabel(formatTariffPriceBdt(tariff.priceBdt))}
        </p>
      ) : null}
      <p className={`mt-1 text-3xl font-extrabold tracking-tight ${theme.price}`}>
        {priceLabel(effectivePrice)}
      </p>
      {onSale && savings != null ? (
        <p className="mt-1 text-sm font-semibold text-emerald-700">
          {saveLabel(formatTariffPriceBdt(savings))}
        </p>
      ) : null}
      {onSale && untilDate ? (
        <p className="mt-1 text-xs font-medium text-emerald-800">
          {offerUntilLabel(untilDate)}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-zinc-600">{durationText}</p>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-zinc-700">{description}</p>
      ) : null}
      {children ? <div className="mt-auto">{children}</div> : null}
    </article>
  );
}
