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
import { LoadingState } from "../components/ScreenState";
import { tNavigation } from "../i18n/messages";
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
    return <ProfileCreationIntentScreen />;
  }

  if (phase === "profile_setup") {
    return <ProfileSetupStack />;
  }

  return null;
}
