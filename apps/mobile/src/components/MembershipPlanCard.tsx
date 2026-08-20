import { StyleSheet, Text, View } from "react-native";
import {
  formatMembershipOfferUntilDate,
  formatTariffPriceBdt,
  isMembershipDiscountActive,
  membershipDiscountLabel,
  membershipDiscountSavingsBdt,
  membershipEffectivePriceBdt,
  type MembershipTariff,
} from "@easymatch/shared";
import { fillMessageTemplate, tMembership } from "../i18n/messages";
import type { AppLocale } from "../lib/locale";
import { colors } from "../theme/colors";

type Props = {
  tariff: MembershipTariff;
  locale: AppLocale;
};

function planTheme(plan: string) {
  if (plan === "platinum") {
    return {
      card: {
        borderColor: "#c4b5fd",
        backgroundColor: "#f5f3ff",
      },
      bar: "#7c3aed",
      badgeBg: "#ede9fe",
      badgeText: "#5b21b6",
      title: "#4c1d95",
      price: colors.rose900,
    };
  }
  return {
    card: {
      borderColor: "#fcd34d",
      backgroundColor: "#fffbeb",
    },
    bar: "#d97706",
    badgeBg: "#fef3c7",
    badgeText: "#92400e",
    title: "#78350f",
    price: "#92400e",
  };
}

export function MembershipPlanCard({ tariff, locale }: Props) {
  const copy = tMembership(locale);
  const theme = planTheme(tariff.plan);
  const onSale = isMembershipDiscountActive(tariff);
  const effectivePrice = formatTariffPriceBdt(membershipEffectivePriceBdt(tariff));
  const savings = membershipDiscountSavingsBdt(tariff);
  const offerName =
    membershipDiscountLabel(tariff, locale) ?? copy.limitedOffer;
  const untilDate = formatMembershipOfferUntilDate(tariff.discountEndsAt, locale);
  const title =
    locale === "bn" && tariff.labelBn ? tariff.labelBn : tariff.labelEn;
  const description =
    locale === "bn" && tariff.descriptionBn
      ? tariff.descriptionBn
      : tariff.descriptionEn;
  const planBadge =
    tariff.plan === "platinum" ? copy.bestValueBadge : copy.popularBadge;

  return (
    <View style={[styles.card, theme.card]}>
      <View style={[styles.bar, { backgroundColor: theme.bar }]} />
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
          <Text style={[styles.badgeText, { color: theme.badgeText }]}>
            {planBadge}
          </Text>
        </View>
        {onSale ? (
          <View style={styles.saleBadge}>
            <Text style={styles.saleBadgeText}>{offerName}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.title, { color: theme.title }]}>{title}</Text>
      {onSale ? (
        <Text style={styles.originalPrice}>
          ৳{formatTariffPriceBdt(tariff.priceBdt)} {tariff.currency}
        </Text>
      ) : null}
      <Text style={[styles.price, { color: theme.price }]}>
        ৳{effectivePrice} {tariff.currency}
      </Text>
      {onSale && savings != null ? (
        <Text style={styles.save}>
          {fillMessageTemplate(copy.saveAmount, {
            amount: formatTariffPriceBdt(savings),
          })}
        </Text>
      ) : null}
      {onSale && untilDate ? (
        <Text style={styles.until}>
          {fillMessageTemplate(copy.offerUntil, { date: untilDate })}
        </Text>
      ) : null}
      <Text style={styles.duration}>
        {fillMessageTemplate(copy.durationLabel, {
          days: tariff.durationDays,
        })}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    overflow: "hidden",
    gap: 4,
  },
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  saleBadge: {
    borderRadius: 999,
    backgroundColor: colors.emerald600,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  saleBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: colors.white,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: "800",
  },
  originalPrice: {
    marginTop: 6,
    fontSize: 13,
    color: colors.zinc500,
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 26,
    fontWeight: "800",
  },
  save: {
    fontSize: 13,
    fontWeight: "700",
    color: "#047857",
  },
  until: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065f46",
  },
  duration: {
    fontSize: 13,
    color: colors.zinc600,
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc700,
  },
});
