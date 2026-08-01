import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { ConsultantPaymentWebView } from "../../components/ConsultantPaymentWebView";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { tConsultant } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import type { ConsultantCheckoutScreenProps } from "../../navigation/types";
import {
  confirmConsultantPayment,
  startConsultantCheckout,
} from "../../services/consultant";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

export default function ConsultantCheckoutScreen({
  navigation,
  route,
}: ConsultantCheckoutScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tConsultant(locale);
  const { connectionId, serviceType, memberNotes } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState<string | null>(null);

  const startCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startConsultantCheckout({
        connectionId,
        serviceType,
        memberNotes,
      });
      setGatewayUrl(result.gatewayUrl);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.checkoutError));
    } finally {
      setLoading(false);
    }
  }, [connectionId, copy.checkoutError, memberNotes, serviceType]);

  useEffect(() => {
    void startCheckout();
  }, [startCheckout]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: gatewayUrl ? copy.redirecting : copy.checkoutTitle,
    });
  }, [copy.checkoutTitle, copy.redirecting, gatewayUrl, navigation]);

  async function handlePaymentComplete(
    outcome: "success" | "fail" | "cancel",
    query?: { tranId?: string; valId?: string },
  ) {
    setGatewayUrl(null);

    if (outcome === "success") {
      try {
        await confirmConsultantPayment({
          tranId: query?.tranId,
          valId: query?.valId,
        });
      } catch {
        // payment may still sync via webhook
      }
      Alert.alert(copy.payment.successTitle, copy.payment.successBody, [
        { text: copy.payment.backToConnections, onPress: () => navigation.goBack() },
      ]);
      return;
    }

    if (outcome === "fail") {
      Alert.alert(copy.payment.failTitle, copy.payment.failBody, [
        { text: copy.tryAgain, style: "default" },
        { text: copy.payment.backToConnections, onPress: () => navigation.goBack() },
      ]);
      return;
    }

    Alert.alert(copy.payment.cancelTitle, copy.payment.cancelBody, [
      { text: copy.payment.backToConnections, onPress: () => navigation.goBack() },
    ]);
  }

  if (gatewayUrl) {
    return (
      <View style={styles.container}>
        <ConsultantPaymentWebView
          gatewayUrl={gatewayUrl}
          onComplete={(outcome, query) => void handlePaymentComplete(outcome, query)}
        />
      </View>
    );
  }

  if (loading) {
    return <LoadingState label={copy.redirecting} />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState message={error} onRetry={() => void startCheckout()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.fallback}>{copy.redirecting}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  fallback: {
    padding: 16,
    fontSize: 14,
    color: colors.zinc600,
  },
});
