import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { videoCallPageUrl } from "../lib/video-call-url";
import { buildWebViewBootstrapScript } from "../lib/webview-bootstrap";
import {
  handleWebViewExternalUrl,
  isInWebViewUrl,
  isUnknownUrlSchemeError,
  openExternalAppUrl,
} from "../lib/webview-external-url";
import type { AppLocale } from "../lib/locale";
import { colors } from "../theme/colors";

type Props = {
  locale: AppLocale;
  connectionId: string;
  callId: string;
  accessToken: string;
  memberName?: string;
  autoJoin?: boolean;
  loadErrorLabel?: string;
  onCallStateChange?: (status: string) => void;
};

async function ensureCallMediaPermissions(): Promise<void> {
  if (Platform.OS !== "android") return;

  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);

  const cameraOk =
    granted[PermissionsAndroid.PERMISSIONS.CAMERA] ===
    PermissionsAndroid.RESULTS.GRANTED;
  const micOk =
    granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
    PermissionsAndroid.RESULTS.GRANTED;

  if (!cameraOk || !micOk) {
    throw new Error("Camera and microphone permissions are required for video calls.");
  }
}

export function VideoCallWebView({
  locale,
  connectionId,
  callId,
  accessToken,
  memberName,
  autoJoin = false,
  loadErrorLabel = "Could not load the call screen. Check the web app is running and EXPO_PUBLIC_VIDEO_CALL_WEB_URL points to HTTPS (ngrok) for physical devices.",
  onCallStateChange,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [permissionsReady, setPermissionsReady] = useState(Platform.OS !== "android");
  const uri = videoCallPageUrl(locale, connectionId, callId, {
    autoJoin,
    memberName,
    nativeShell: true,
  });

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void ensureCallMediaPermissions()
      .then(() => setPermissionsReady(true))
      .catch((err) => {
        setLoadError(
          err instanceof Error ? err.message : "Media permissions denied.",
        );
        setLoading(false);
      });
  }, []);

  const injectedJavaScriptOnLoad = useMemo(
    () =>
      `(function(){try{document.body.style.touchAction='manipulation';document.documentElement.style.touchAction='manipulation';}catch(e){}})();true;`,
    [],
  );

  const injectedJavaScriptBeforeContentLoaded = useMemo(
    () =>
      buildWebViewBootstrapScript({
        accessToken,
      }),
    [accessToken],
  );

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        status?: string;
      };
      if (data.type === "video_call" && data.status) {
        onCallStateChange?.(data.status);
      }
    } catch {
      /* ignore non-json messages */
    }
  }

  if (!permissionsReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.rose800} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{loadError}</Text>
        <Text style={styles.errorHint}>{loadErrorLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.rose800} />
        </View>
      ) : null}
      <WebView
        ref={webViewRef}
        source={{ uri }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        injectedJavaScript={injectedJavaScriptOnLoad}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        originWhitelist={["*"]}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        startInLoadingState
        onMessage={handleMessage}
        onLoadEnd={() => {
          setLoading(false);
          webViewRef.current?.requestFocus?.();
        }}
        onHttpError={(event) => {
          const { statusCode } = event.nativeEvent;
          setLoadError(`Web page failed to load (HTTP ${statusCode}).`);
          setLoading(false);
        }}
        onShouldStartLoadWithRequest={(request) =>
          handleWebViewExternalUrl(request.url)
        }
        onError={(event) => {
          const { code, description, url } = event.nativeEvent;
          if (url && !isInWebViewUrl(url)) {
            void openExternalAppUrl(url);
            return;
          }
          if (isUnknownUrlSchemeError(code, description)) return;
          setLoadError(description || "Could not load the call screen.");
          setLoading(false);
        }}
        onPermissionRequest={(request: {
          grant: (resources: string[]) => void;
          deny?: () => void;
          resources: string[];
        }) => {
          request.grant(request.resources);
        }}
        mediaCapturePermissionGrantType="grant"
        allowsProtectedMedia
        nestedScrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.zinc900,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.zinc900,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.zinc900,
    paddingHorizontal: 20,
    gap: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.zinc900,
    zIndex: 2,
  },
  errorText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  errorHint: {
    color: colors.zinc400,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
