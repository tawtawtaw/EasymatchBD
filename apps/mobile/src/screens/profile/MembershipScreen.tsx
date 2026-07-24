import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatTariffPriceBdt, type MembershipTariff } from "@easymatch/shared";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { useMemberVerificationState } from "../../hooks/use-member-verification-state";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { useMembershipCheckout } from "../../hooks/use-membership-checkout";
import { tMembership } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import {
  formatMembershipDate,
  membershipPlanLabel,
} from "../../lib/membership-labels";
import type { MembershipScreenProps } from "../../navigation/types";
import {
  getMembershipAccount,
  getMembershipTariffs,
  type MembershipAccountSummary,
} from "../../services/membership";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <View style={styles.featureList}>
      {items.map((item) => (
        <Text key={item} style={styles.featureItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export default function MembershipScreen({ navigation }: MembershipScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tMembership(locale);
  const subCopy = copy.subscription;
  const isPaid = useIsPaidMember();
  const { refresh: refreshVerification } = useMemberVerificationState({
    refreshOnMount: true,
  });
  const { openCheckout } = useMembershipCheckout();
  const [account, setAccount] = useState<MembershipAccountSummary | null>(null);
  const [tariffs, setTariffs] = useState<MembershipTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [accountData, tariffData] = await Promise.all([
          getMembershipAccount(),
          getMembershipTariffs(),
        ]);
        setAccount(accountData);
        setTariffs(tariffData);
      } catch (err) {
        setError(getApiErrorMessage(err, subCopy.loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [subCopy.loadError],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !refreshing) {
    return <LoadingState label={subCopy.loading} />;
  }

  if (error && !account) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  const subscription = account?.subscription;
  const hasPaidPlan = Boolean(subscription && subscription.plan !== "free");
  const periodStartsAt =
    subscription?.currentPeriodStartsAt ?? subscription?.startsAt ?? null;
  const periodEndsAt =
    subscription?.currentPeriodEndsAt ?? subscription?.endsAt ?? null;
  const statusLabel = subscription?.isPaidMember
    ? subCopy.statusActive
    : subCopy.statusInactive;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void refreshVerification();
            void load(true);
          }}
        />
      }
    >
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <Text style={styles.subtitle}>{copy.subtitle}</Text>

      {isPaid ? (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>{copy.alreadyPaid}</Text>
        </View>
      ) : null}

      {hasPaidPlan && subscription ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{subCopy.title}</Text>
          <InfoRow
            label={subCopy.plan}
            value={membershipPlanLabel(subscription.plan, tariffs, locale)}
          />
          <InfoRow
            label={subCopy.startsAt}
            value={formatMembershipDate(locale, periodStartsAt)}
          />
          <InfoRow
            label={subCopy.endsAt}
            value={formatMembershipDate(locale, periodEndsAt)}
          />
          <InfoRow label={subCopy.status} value={statusLabel} />
        </View>
      ) : null}

      {account && account.payments.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{subCopy.paymentsTitle}</Text>
          {account.payments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              <Text style={styles.paymentPlan}>
                {membershipPlanLabel(payment.plan, tariffs, locale)}
              </Text>
              <Text style={styles.paymentMeta}>
                {formatMembershipDate(
                  locale,
                  payment.validatedAt ?? payment.createdAt,
                )}
              </Text>
              <Text style={styles.paymentAmount}>
                {subCopy.amountValue
                  .replace("{amount}", formatTariffPriceBdt(payment.amountBdt))
                  .replace("{currency}", payment.currency)}
              </Text>
              <Text style={styles.paymentTran}>
                {subCopy.transactionId}: {payment.tranId}
              </Text>
            </View>
          ))}
        </View>
      ) : hasPaidPlan ? (
        <Text style={styles.note}>{subCopy.noPaymentsOnFile}</Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.freeTitle}</Text>
        <FeatureList
          items={[copy.freeBrowse, copy.freeProfile, copy.freeVerification]}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.paidTitle}</Text>
        <FeatureList
          items={[
            copy.paidInterest,
            copy.paidMessages,
            copy.paidVideoCalls,
            copy.paidBiodataPdf,
          ]}
        />
        <Text style={styles.note}>{copy.verifiedOnlyNote}</Text>
      </View>

      {!isPaid ? (
        <View style={styles.gateWrap}>
          <PaidMembershipGate
            feature="connect"
            locale={locale}
            compact
            onVerifyRequired={() => navigation.navigate("ProfileMedia")}
          />
        </View>
      ) : (
        <Pressable style={styles.secondaryButton} onPress={() => void openCheckout()}>
          <Text style={styles.secondaryButtonText}>{copy.viewPlans}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
  },
  activeBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    backgroundColor: "#ecfdf5",
    padding: 12,
  },
  activeBannerText: {
    fontSize: 14,
    color: "#065f46",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc500,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 15,
    color: colors.zinc800,
  },
  featureList: {
    gap: 6,
  },
  featureItem: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc700,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc500,
  },
  paymentCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.rose50,
    padding: 12,
    gap: 4,
  },
  paymentPlan: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.rose900,
  },
  paymentMeta: {
    fontSize: 12,
    color: colors.zinc600,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.zinc800,
  },
  paymentTran: {
    fontSize: 11,
    color: colors.zinc500,
    fontFamily: "monospace",
  },
  gateWrap: {
    marginTop: 4,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    color: colors.rose800,
    fontSize: 16,
    fontWeight: "700",
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
});
