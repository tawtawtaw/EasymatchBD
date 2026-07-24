import type { MembershipTariff } from "@easymatch/shared";
import type { AppLocale } from "./locale";

export function membershipPlanLabel(
  plan: string,
  tariffs: MembershipTariff[],
  locale: AppLocale,
): string {
  const tariff = tariffs.find((item) => item.plan === plan);
  if (!tariff) {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
  return locale === "bn" && tariff.labelBn ? tariff.labelBn : tariff.labelEn;
}

export function formatMembershipDate(
  locale: AppLocale,
  iso: string | null | undefined,
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
