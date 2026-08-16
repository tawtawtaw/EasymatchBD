import { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EditFamilyScreen from "../screens/profile/EditFamilyScreen";
import EditMaritalScreen from "../screens/profile/EditMaritalScreen";
import EditPartnerScreen from "../screens/profile/EditPartnerScreen";
import EditPersonalScreen from "../screens/profile/EditPersonalScreen";
import ProfileMediaScreen from "../screens/profile/ProfileMediaScreen";
import {
  ProfileCreationIntentScreen,
  ProfileSetupScreen,
  TermsAcceptanceScreen,
  TermsDeclinedScreen,
} from "../screens/onboarding";
import PinSetupScreen from "../screens/onboarding/PinSetupScreen";
import { LoadingState } from "../components/ScreenState";
import { tNavigation } from "../i18n/messages";
import { hasSeenPinSetupPrompt } from "../lib/pin-setup-prompt";
import { useAppLockStore } from "../store/appLockStore";
import { useAuthStore } from "../store/authStore";
import { useOnboardingStore } from "../store/onboardingStore";
import { useLocaleStore } from "../store/localeStore";
import type { OnboardingStackParamList } from "./types";
import { appStackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

function TermsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TermsAcceptance" component={TermsAcceptanceScreen} />
      <Stack.Screen name="TermsDeclined" component={TermsDeclinedScreen} />
    </Stack.Navigator>
  );
}

function ProfileSetupStack() {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);

  return (
    <Stack.Navigator screenOptions={appStackScreenOptions}>
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{ title: nav.stacks.createProfile }}
      />
      <Stack.Screen
        name="EditPersonal"
        component={EditPersonalScreen}
        options={{ title: nav.stacks.personalBiodata }}
      />
      <Stack.Screen
        name="EditFamily"
        component={EditFamilyScreen}
        options={{ title: nav.stacks.familyBiodata }}
      />
      <Stack.Screen
        name="EditMarital"
        component={EditMaritalScreen}
        options={{ title: nav.stacks.maritalInfo }}
      />
      <Stack.Screen
        name="EditPartner"
        component={EditPartnerScreen}
        options={{ title: nav.stacks.partnerPreferences }}
      />
      <Stack.Screen
        name="ProfileMedia"
        component={ProfileMediaScreen}
        options={{ title: nav.stacks.photos }}
      />
    </Stack.Navigator>
  );
}

function CreationIntentGate() {
  const userId = useAuthStore((s) => s.user?.id);
  const lockEnabled = useAppLockStore((s) => s.enabled);
  const refreshLock = useAppLockStore((s) => s.refresh);
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);
  const [showPinSetup, setShowPinSetup] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await refreshLock();
      if (cancelled) return;
      if (useAppLockStore.getState().enabled) {
        setShowPinSetup(false);
        return;
      }
      if (!userId) {
        setShowPinSetup(false);
        return;
      }
      const seen = await hasSeenPinSetupPrompt(userId);
      if (!cancelled) setShowPinSetup(!seen);
    })();

    return () => {
      cancelled = true;
    };
  }, [lockEnabled, refreshLock, userId]);

  if (showPinSetup === null) {
    return <LoadingState label={nav.app.preparingAccount} />;
  }

  if (showPinSetup) {
    return <PinSetupScreen onFinished={() => setShowPinSetup(false)} />;
  }

  return <ProfileCreationIntentScreen />;
}

export function OnboardingStack() {
  const phase = useOnboardingStore((s) => s.phase);
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);

  if (phase === "loading") {
    return <LoadingState label={nav.app.preparingAccount} />;
  }

  if (phase === "terms") {
    return <TermsStack />;
  }

  if (phase === "creation_intent") {
    return <CreationIntentGate />;
  }

  if (phase === "profile_setup") {
    return <ProfileSetupStack />;
  }

  return null;
}
