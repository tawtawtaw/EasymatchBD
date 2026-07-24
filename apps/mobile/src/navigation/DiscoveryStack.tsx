import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AccountMenuButton } from "../components/AccountMenuButton";
import { tNavigation } from "../i18n/messages";
import DiscoveryListScreen from "../screens/discovery/DiscoveryListScreen";
import DiscoveryProfileScreen from "../screens/discovery/DiscoveryProfileScreen";
import ProfileCompareScreen from "../screens/discovery/ProfileCompareScreen";
import SavedProfilesScreen from "../screens/discovery/SavedProfilesScreen";
import { useLocaleStore } from "../store/localeStore";
import type { DiscoveryStackParamList } from "./types";
import { appStackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<DiscoveryStackParamList>();

export function DiscoveryStack() {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);

  return (
    <Stack.Navigator screenOptions={appStackScreenOptions}>
      <Stack.Screen
        name="DiscoveryList"
        component={DiscoveryListScreen}
        options={{
          title: nav.stacks.discovery,
          headerRight: () => <AccountMenuButton />,
        }}
      />
      <Stack.Screen
        name="DiscoveryProfile"
        component={DiscoveryProfileScreen}
        options={{ title: nav.stacks.discoveryProfile }}
      />
      <Stack.Screen
        name="DiscoveryCompare"
        component={ProfileCompareScreen}
        options={{ title: nav.stacks.compare }}
      />
      <Stack.Screen
        name="SavedProfiles"
        component={SavedProfilesScreen}
        options={{ title: nav.stacks.savedProfiles }}
      />
    </Stack.Navigator>
  );
}
