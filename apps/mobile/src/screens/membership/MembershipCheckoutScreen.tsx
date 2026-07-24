import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatTariffPriceBdt, type MembershipTariff } from "@easymatch/shared";
import { MembershipPaymentWebView } from "../../components/MembershipPaymentWebView";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { useMemberVerificationState } from "../../hooks/use-member-verification-state";
import { tMembership } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import type { MembershipCheckoutScreenProps } from "../../navigation/types";
import {
  confirmMembershipPayment,
  getMembershipTariffs,
  startMembershipCheckout,
} from "../../services/membership";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

export default function MembershipCheckoutScreen({
  navigation,
}: MembershipCheckoutScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tMembership(locale);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const [tariffs, setTariffs] = useState<MembershipTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState<string | null>(null);

  const { verified, awaitingOfficer, loading: verificationLoading } =
    useMemberVerificationState({ refreshOnMount: true });

  const loadTariffs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTariffs(await getMembershipTariffs());
    } catch (err) {
      setError(getApiErrorMessage(err, copy.plansLoadError));
    } finally {
      setLoading(false);
    }
  }, [copy.plansLoadError]);

  useEffect(() => {
    void loadTariffs();
  }, [loadTariffs]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: gatewayUrl ? copy.redirecting : copy.checkoutTitle,
    });
  }, [copy.checkoutTitle, copy.redirecting, gatewayUrl, navigation]);

  function tariffLabel(tariff: MembershipTariff) {
    return locale === "bn" && tariff.labelBn ? tariff.labelBn : tariff.labelEn;
  }

  function tariffDescription(tariff: MembershipTariff) {
    return locale === "bn" && tariff.descriptionBn
      ? tariff.descriptionBn
      : tariff.descriptionEn;
  }

  async function handleCheckout(plan: string) {
    setCheckoutError(null);
    setCheckoutPlan(plan);
    try {
      const result = await startMembershipCheckout(plan);
      setGatewayUrl(result.gatewayUrl);
    } catch (err) {
      setCheckoutError(getApiErrorMessage(err, copy.checkoutError));
    } finally {
      setCheckoutPlan(null);
    }
  }

  async function handlePaymentComplete(
    outcome: "success" | "fail" | "cancel",
    query?: { tranId?: string; valId?: string },
  ) {
    setGatewayUrl(null);

    if (outcome === "success") {
      try {
        await confirmMembershipPayment({
          tranId: query?.tranId,
          valId: query?.valId,
        });
        await refreshSession();
      } catch {
        // payment may still sync via webhook
        try {
          await refreshSession();
        } catch {
          // ignore
        }
      }
      Alert.alert(copy.checkoutSuccessTitle, copy.checkoutSuccessBody, [
        { text: copy.backToApp, onPress: () => navigation.goBack() },
      ]);
      return;
    }

    if (outcome === "fail") {
      Alert.alert(copy.checkoutFailTitle, copy.checkoutFailBody, [
        { text: copy.tryAgain, style: "default" },
        { text: copy.backToApp, onPress: () => navigation.goBack() },
      ]);
      return;
    }

    navigation.goBack();
  }

  if (verificationLoading) {
    return <LoadingState message={copy.checkoutTitle} />;
  }

  if (!verified) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedTitle}>
          {awaitingOfficer
            ? copy.verificationPendingTitle
            : copy.verificationRequiredTitle}
        </Text>
        <Text style={styles.blockedBody}>
          {awaitingOfficer
            ? copy.verificationPendingNote
            : copy.verificationRequiredBody}
        </Text>
      </View>
    );
  }

  if (gatewayUrl) {
    return (
      <View style={styles.container}>
        <MembershipPaymentWebView
          gatewayUrl={gatewayUrl}
          onComplete={(outcome, query) => void handlePaymentComplete(outcome, query)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <LoadingState label={copy.checkoutLoading} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadTariffs()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>{copy.checkoutSubtitle}</Text>
          <Text style={styles.sectionTitle}>{copy.plansTitle}</Text>
          {checkoutError ? <Text style={styles.errorBanner}>{checkoutError}</Text> : null}
          {tariffs.length === 0 ? (
            <Text style={styles.empty}>{copy.plansEmpty}</Text>
          ) : (
            tariffs.map((tariff) => {
              const paying = checkoutPlan === tariff.plan;
              return (
                <View key={tariff.id} style={styles.planCard}>
                  <Text style={styles.planTitle}>{tariffLabel(tariff)}</Text>
                  <Text style={styles.planPrice}>
                    ৳{formatTariffPriceBdt(tariff.priceBdt)} {tariff.currency}
                  </Text>
                  <Text style={styles.planDuration}>
                    {copy.durationLabel.replace("{days}", String(tariff.durationDays))}
                  </Text>
                  {tariffDescription(tariff) ? (
                    <Text style={styles.planDescription}>{tariffDescription(tariff)}</Text>
                  ) : null}
                  <Pressable
                    style={[styles.payButton, paying && styles.payButtonDisabled]}
                    onPress={() => void handleCheckout(tariff.plan)}
                    disabled={paying}
                  >
                    <Text style={styles.payButtonText}>
                      {paying ? copy.redirecting : copy.payWithSsl}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.rose900,
    gap: 4,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.white,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#fecdd3",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.zinc900,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    padding: 16,
    gap: 6,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.rose900,
  },
  planDuration: {
    fontSize: 13,
    color: colors.zinc600,
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
    marginTop: 4,
  },
  payButton: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 12,
    alignItems: "center",
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  blocked: {
    flex: 1,
    backgroundColor: colors.rose50,
    paddingHorizontal: 20,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.zinc900,
  },
  blockedBody: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.zinc600,
  },
  blockedButton: {
    marginTop: 20,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  blockedButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
});
