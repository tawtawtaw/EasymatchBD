import { useFocusEffect } from "@react-navigation/native";
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
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { useMemberVerificationState } from "../../hooks/use-member-verification-state";
import { tMembership } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import {
  membershipWebPageUrl,
  openMembershipWebPage,
  syncMembershipAfterWebPayment,
} from "../../lib/membership-web-checkout";
import type { MembershipCheckoutScreenProps } from "../../navigation/types";
import { getMembershipTariffs } from "../../services/membership";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

export default function MembershipCheckoutScreen({
  navigation,
}: MembershipCheckoutScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tMembership(locale);
  const isPaid = useIsPaidMember();
  const [tariffs, setTariffs] = useState<MembershipTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [openingWeb, setOpeningWeb] = useState(false);

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
    navigation.setOptions({ title: copy.checkoutTitle });
  }, [copy.checkoutTitle, navigation]);

  const applySyncResult = useCallback(
    (paid: boolean, options?: { silent?: boolean }) => {
      if (!paid) {
        if (!options?.silent) {
          Alert.alert(copy.refreshMembershipTitle, copy.refreshMembershipStillFree);
        }
        return;
      }
      Alert.alert(copy.checkoutSuccessTitle, copy.checkoutSuccessBody, [
        { text: copy.backToApp, onPress: () => navigation.goBack() },
      ]);
    },
    [copy, navigation],
  );

  const runSync = useCallback(
    async (options?: { silent?: boolean }) => {
      setSyncing(true);
      try {
        const { isPaidMember: paid } = await syncMembershipAfterWebPayment();
        applySyncResult(paid, options);
      } catch {
        if (!options?.silent) {
          Alert.alert(copy.refreshMembershipTitle, copy.refreshMembershipError);
        }
      } finally {
        setSyncing(false);
      }
    },
    [applySyncResult, copy.refreshMembershipError, copy.refreshMembershipTitle],
  );

  useFocusEffect(
    useCallback(() => {
      if (!verified || isPaid) return;
      void (async () => {
        try {
          const { isPaidMember: paid } = await syncMembershipAfterWebPayment();
          applySyncResult(paid, { silent: !paid });
        } catch {
          // ignore background sync errors
        }
      })();
    }, [verified, isPaid, applySyncResult]),
  );

  async function handleOpenWeb() {
    setOpeningWeb(true);
    try {
      const opened = await openMembershipWebPage(locale);
      if (!opened) {
        Alert.alert(copy.checkoutTitle, copy.webPayOpenError);
      }
    } finally {
      setOpeningWeb(false);
    }
  }

  function tariffLabel(tariff: MembershipTariff) {
    return locale === "bn" && tariff.labelBn ? tariff.labelBn : tariff.labelEn;
  }

  function tariffDescription(tariff: MembershipTariff) {
    return locale === "bn" && tariff.descriptionBn
      ? tariff.descriptionBn
      : tariff.descriptionEn;
  }

  if (verificationLoading) {
    return <LoadingState label={copy.checkoutTitle} />;
  }

  if (isPaid) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedTitle}>{copy.checkoutSuccessTitle}</Text>
        <Text style={styles.blockedBody}>{copy.alreadyPaid}</Text>
        <Pressable style={styles.paidBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.paidBackButtonText}>{copy.backToApp}</Text>
        </Pressable>
      </View>
    );
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

  return (
    <View style={styles.container}>
      {loading ? (
        <LoadingState label={copy.checkoutLoading} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadTariffs()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.lead}>{copy.webPayLead}</Text>
          <View style={styles.stepsCard}>
            {[copy.webPayStep1, copy.webPayStep2, copy.webPayStep3, copy.webPayStep4].map(
              (step, index) => (
                <Text key={step} style={styles.step}>
                  {index + 1}. {step}
                </Text>
              ),
            )}
          </View>
          <Text style={styles.urlHint}>{membershipWebPageUrl(locale)}</Text>
          <Text style={styles.policyNote}>{copy.webPayStorePolicyNote}</Text>

          <Pressable
            style={[styles.primaryButton, openingWeb && styles.buttonDisabled]}
            onPress={() => void handleOpenWeb()}
            disabled={openingWeb}
          >
            <Text style={styles.primaryButtonText}>
              {openingWeb ? copy.webPayOpening : copy.openMembershipWebsite}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, syncing && styles.buttonDisabled]}
            onPress={() => void runSync()}
            disabled={syncing}
          >
            <Text style={styles.secondaryButtonText}>
              {syncing ? copy.refreshMembershipLoading : copy.refreshMembershipStatus}
            </Text>
          </Pressable>

          <Text style={styles.sectionTitle}>{copy.plansTitle}</Text>
          <Text style={styles.plansHint}>{copy.webPayPlansHint}</Text>
          {tariffs.length === 0 ? (
            <Text style={styles.empty}>{copy.plansEmpty}</Text>
          ) : (
            tariffs.map((tariff) => (
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
              </View>
            ))
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
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.zinc800,
  },
  stepsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    padding: 16,
    gap: 10,
  },
  step: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc700,
  },
  urlHint: {
    fontSize: 12,
    color: colors.zinc500,
    fontFamily: "monospace",
  },
  policyNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.zinc500,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.zinc900,
    marginTop: 8,
  },
  plansHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc600,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc600,
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
  primaryButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    color: colors.rose800,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  blocked: {
    flex: 1,
    backgroundColor: colors.rose50,
    paddingHorizontal: 20,
    paddingTop: 24,
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
  paidBackButton: {
    marginTop: 20,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  paidBackButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
});
