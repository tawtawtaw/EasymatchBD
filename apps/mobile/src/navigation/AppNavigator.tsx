import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import MembershipCheckoutScreen from "../screens/membership/MembershipCheckoutScreen";
import ConsultantCheckoutScreen from "../screens/consultant/ConsultantCheckoutScreen";
import ConsultantCaseScreen from "../screens/consultant/ConsultantCaseScreen";
import VideoCallRoomScreen from "../screens/messages/VideoCallRoomScreen";
import { MainAppShell } from "../components/MainAppShell";
import { PushNotificationHost } from "../components/PushNotificationHost";
import { useAuthStore } from "../store/authStore";
import { useOnboardingStore } from "../store/onboardingStore";
import { useLocaleStore } from "../store/localeStore";
import { API_BASE_URL } from "../services/api/client";
import { enablePushNotificationsOnLogin } from "../services/push-notifications";
import { flushPendingIncomingCallNavigation, hasPendingIncomingCallNavigation, subscribeIncomingCallNavigation } from "../services/incoming-call-navigation";
import { tNavigation } from "../i18n/messages";
import { colors } from "../theme/colors";
import { publishActiveRoute } from "./active-route";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabs } from "./MainTabs";
import { navigationRef } from "./navigationRef";
import { OnboardingStack } from "./OnboardingStack";
import type { RootStackParamList } from "./types";
import { appStackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const skipBootstrap = useAuthStore((s) => s.skipBootstrap);
  const user = useAuthStore((s) => s.user);
  const userId = useAuthStore((s) => s.user?.id);
  const session = useAuthStore((s) => s.session);
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);
  const onboardingPhase = useOnboardingStore((s) => s.phase);
  const refreshOnboarding = useOnboardingStore((s) => s.refresh);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const [showSkip, setShowSkip] = useState(false);
  const [incomingCallLaunch, setIncomingCallLaunch] = useState(false);

  useEffect(() => {
    return subscribeIncomingCallNavigation(() => {
      setIncomingCallLaunch(hasPendingIncomingCallNavigation());
    });
  }, []);

  useEffect(() => {
    if (!user) {
      resetOnboarding();
      return;
    }
    void refreshOnboarding(locale);
  }, [locale, refreshOnboarding, resetOnboarding, userId]);

  useEffect(() => {
    if (!user || onboardingPhase !== "complete") {
      return;
    }
    void enablePushNotificationsOnLogin();
  }, [onboardingPhase, userId]);

  useEffect(() => {
    if (!isBootstrapping) {
      setShowSkip(false);
      return;
    }
    const timer = setTimeout(() => setShowSkip(true), 4000);
    return () => clearTimeout(timer);
  }, [isBootstrapping]);

  useEffect(() => {
    if (!isBootstrapping) {
      flushPendingIncomingCallNavigation();
    }
  }, [isBootstrapping, userId]);

  if (
    isBootstrapping &&
    !incomingCallLaunch &&
    !hasPendingIncomingCallNavigation()
  ) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.rose50,
          padding: 24,
        }}
      >
        <ActivityIndicator size="large" color={colors.rose800} />
        <Text style={{ marginTop: 16, color: colors.zinc600 }}>{nav.app.loading}</Text>
        {__DEV__ ? (
          <Text
            style={{
              marginTop: 24,
              fontSize: 11,
              color: colors.zinc500,
              textAlign: "center",
            }}
          >
            API: {API_BASE_URL}
          </Text>
        ) : null}
        {showSkip ? (
          <Pressable
            onPress={() => void skipBootstrap()}
            style={{
              marginTop: 24,
              borderRadius: 999,
              backgroundColor: colors.rose800,
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: "700" }}>{nav.app.continueSignIn}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const needsOnboarding = user && onboardingPhase !== "complete";

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        publishActiveRoute(navigationRef.getRootState());
        flushPendingIncomingCallNavigation();
      }}
      onStateChange={(state) => publishActiveRoute(state)}
    >
      <PushNotificationHost />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          needsOnboarding ? (
            <Stack.Screen name="Onboarding" component={OnboardingStack} />
          ) : (
            <>
              <Stack.Screen name="Main">
                {() => (
                  <MainAppShell>
                    <MainTabs
                      initialRouteName={
                        session?.isVerified ?? user.isVerified ? "Home" : "Discovery"
                      }
                    />
                  </MainAppShell>
                )}
              </Stack.Screen>
              <Stack.Screen
                name="MembershipCheckout"
                component={MembershipCheckoutScreen}
                options={{
                  ...appStackScreenOptions,
                  presentation: "card",
                  headerShown: true,
                }}
              />
              <Stack.Screen
                name="ConsultantCheckout"
                component={ConsultantCheckoutScreen}
                options={{
                  ...appStackScreenOptions,
                  presentation: "card",
                  headerShown: true,
                }}
              />
              <Stack.Screen
                name="ConsultantCase"
                component={ConsultantCaseScreen}
                options={{
                  ...appStackScreenOptions,
                  presentation: "card",
                  headerShown: true,
                }}
              />
            </>
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
        <Stack.Screen
          name="VideoCallRoom"
          component={VideoCallRoomScreen}
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            animation: "fade",
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
