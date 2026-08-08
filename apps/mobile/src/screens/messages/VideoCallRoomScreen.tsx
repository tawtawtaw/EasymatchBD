import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoCallWebView } from "../../components/VideoCallWebView";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { tVideoCalls } from "../../i18n/video-calls";
import type { VideoCallRoomScreenProps } from "../../navigation/types";
import { endVideoCall } from "../../services/video-calls";
import { trySilentSessionRestore } from "../../services/auth";
import { endAndroidTelecomCall } from "../../services/android-incoming-call-telecom";
import { sessionStorage } from "../../services/session-storage";
import { useAuthStore } from "../../store/authStore";
import { useMemberAlertsStore } from "../../store/memberAlertsStore";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

function statusLabel(
  status: string,
  copy: ReturnType<typeof tVideoCalls>,
): string {
  switch (status) {
    case "joining":
      return copy.joiningCall;
    case "ringing":
      return copy.ringingStatus;
    case "connecting":
      return copy.connectingVideo;
    case "active":
      return copy.inCall;
    case "ended":
      return copy.callEnded;
    default:
      return copy.loadingCall;
  }
}

export default function VideoCallRoomScreen({
  navigation,
  route,
}: VideoCallRoomScreenProps) {
  const { connectionId, callId, memberName, autoJoin = false } = route.params;
  const locale = useLocaleStore((s) => s.locale);
  const copy = tVideoCalls(locale);
  const dismissIncomingCall = useMemberAlertsStore((s) => s.dismissIncomingCall);
  const pausePolling = useMemberAlertsStore((s) => s.pausePolling);
  const resumePolling = useMemberAlertsStore((s) => s.resumePolling);
  const insets = useSafeAreaInsets();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [callStatus, setCallStatus] = useState("loading");
  const exitedRef = useRef(false);

  const exitCallScreen = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    if (useAuthStore.getState().user) {
      navigation.navigate("Main", {
        screen: "Messages",
        params: { screen: "MessagesList" },
      });
      return;
    }

    navigation.navigate("Auth");
  }, [navigation]);

  const loadToken = useCallback(async () => {
    setLoading(true);
    try {
      let token = await sessionStorage.getAccessToken();
      if (!token) {
        token = await trySilentSessionRestore();
      }
      setAccessToken(token);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  useEffect(() => {
    pausePolling();
    return () => {
      resumePolling();
    };
  }, [pausePolling, resumePolling]);

  useEffect(() => {
    if (autoJoin) {
      dismissIncomingCall();
    }
  }, [autoJoin, dismissIncomingCall]);

  const handleEndCall = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      await endVideoCall(callId);
    } catch {
      /* call may already be ended */
    } finally {
      setEnding(false);
      void endAndroidTelecomCall(callId);
      exitCallScreen();
    }
  }, [callId, ending, exitCallScreen]);

  const handleCallStateChange = useCallback(
    (status: string) => {
      setCallStatus(status);
      if (status === "ended") {
        void endAndroidTelecomCall(callId);
        exitCallScreen();
      }
    },
    [exitCallScreen],
  );

  if (loading) {
    return <LoadingState label={autoJoin ? copy.joiningCall : copy.loadingCall} />;
  }

  if (!accessToken) {
    return (
      <ErrorState
        message={copy.signInRequired}
        onRetry={exitCallScreen}
      />
    );
  }

  const subtitle = statusLabel(callStatus, copy);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.partnerName} numberOfLines={1}>
            {memberName}
          </Text>
          <Text style={styles.statusText} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          style={[styles.endButton, ending && styles.endButtonDisabled]}
          disabled={ending}
          onPress={() => void handleEndCall()}
        >
          {ending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.endButtonText}>{copy.endCall}</Text>
          )}
        </Pressable>
      </View>
      <View style={styles.webviewHost}>
        <VideoCallWebView
          locale={locale}
          connectionId={connectionId}
          callId={callId}
          accessToken={accessToken}
          memberName={memberName}
          autoJoin={autoJoin}
          loadErrorLabel={copy.loadCallError}
          onCallStateChange={handleCallStateChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.zinc900,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: "rgba(76, 5, 25, 0.82)",
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  webviewHost: {
    flex: 1,
    minHeight: 0,
  },
  partnerName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  statusText: {
    color: colors.rose100,
    fontSize: 12,
    fontWeight: "500",
  },
  endButton: {
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.red600,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  endButtonDisabled: {
    opacity: 0.75,
  },
  endButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
});
