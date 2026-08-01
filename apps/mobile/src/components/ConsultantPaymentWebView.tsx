import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import {
  handleWebViewExternalUrl,
  isInWebViewUrl,
  isUnknownUrlSchemeError,
  openExternalAppUrl,
} from "../lib/webview-external-url";
import { colors } from "../theme/colors";

export type ConsultantCheckoutOutcome = "success" | "fail" | "cancel";

export type ConsultantPaymentQuery = {
  tranId?: string;
  valId?: string;
};

type Props = {
  gatewayUrl: string;
  onComplete: (outcome: ConsultantCheckoutOutcome, query?: ConsultantPaymentQuery) => void;
};

function parsePaymentOutcome(url: string): ConsultantCheckoutOutcome | null {
  if (url.includes("/connections/consultant/payment/success")) return "success";
  if (url.includes("/connections/consultant/payment/fail")) return "fail";
  if (url.includes("/connections/consultant/payment/cancel")) return "cancel";
  return null;
}

function parseQueryParam(url: string, key: string): string | undefined {
  try {
    return new URL(url).searchParams.get(key) ?? undefined;
  } catch {
    try {
      return new URL(url, "https://easymatchbd.local").searchParams.get(key) ?? undefined;
    } catch {
      return undefined;
    }
  }
}

export function ConsultantPaymentWebView({ gatewayUrl, onComplete }: Props) {
  const [loading, setLoading] = useState(true);
  const handledRef = useRef(false);

  function handlePaymentUrl(url: string) {
    if (handledRef.current) return;
    const outcome = parsePaymentOutcome(url);
    if (!outcome) return;
    handledRef.current = true;
    onComplete(outcome, {
      tranId: parseQueryParam(url, "tran_id"),
      valId: parseQueryParam(url, "val_id"),
    });
  }

  function shouldLoadUrl(url: string): boolean {
    handlePaymentUrl(url);
    return handleWebViewExternalUrl(url);
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.rose800} />
        </View>
      ) : null}
      <WebView
        source={{ uri: gatewayUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        startInLoadingState
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={(request) => shouldLoadUrl(request.url)}
        onNavigationStateChange={(state) => {
          if (state.url) handlePaymentUrl(state.url);
        }}
        onError={(event) => {
          const { code, description, url } = event.nativeEvent;
          if (url && !isInWebViewUrl(url)) {
            void openExternalAppUrl(url);
            return;
          }
          if (isUnknownUrlSchemeError(code, description)) return;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    zIndex: 2,
  },
});
