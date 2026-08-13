import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AccountMenuButton } from "../components/AccountMenuButton";
import { tNavigation } from "../i18n/messages";
import EditFamilyScreen from "../screens/profile/EditFamilyScreen";
import EditMaritalScreen from "../screens/profile/EditMaritalScreen";
import EditPartnerScreen from "../screens/profile/EditPartnerScreen";
import EditPersonalScreen from "../screens/profile/EditPersonalScreen";
import BiodataExportScreen from "../screens/profile/BiodataExportScreen";
import MembershipScreen from "../screens/profile/MembershipScreen";
import ProfileMediaScreen from "../screens/profile/ProfileMediaScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import SettingsScreen from "../screens/profile/SettingsScreen";
import ComplaintDetailScreen from "../screens/complaints/ComplaintDetailScreen";
import ComplaintsScreen from "../screens/complaints/ComplaintsScreen";
import { useLocaleStore } from "../store/localeStore";
import type { ProfileStackParamList } from "./types";
import { appStackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  const locale = useLocaleStore((s) => s.locale);
  const nav = tNavigation(locale);

  return (
    <Stack.Navigator screenOptions={appStackScreenOptions}>
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{
          title: nav.stacks.myProfile,
          headerRight: () => <AccountMenuButton />,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: nav.stacks.settings,
          headerRight: () => <AccountMenuButton />,
        }}
      />
      <Stack.Screen name="EditPersonal" component={EditPersonalScreen} />
      <Stack.Screen name="EditFamily" component={EditFamilyScreen} />
      <Stack.Screen name="EditMarital" component={EditMaritalScreen} />
      <Stack.Screen name="EditPartner" component={EditPartnerScreen} />
      <Stack.Screen name="ProfileMedia" component={ProfileMediaScreen} />
      <Stack.Screen
        name="BiodataExport"
        component={BiodataExportScreen}
        options={{ title: nav.stacks.exportBiodata }}
      />
      <Stack.Screen
        name="Membership"
        component={MembershipScreen}
        options={{ title: nav.stacks.membership }}
      />
      <Stack.Screen
        name="Complaints"
        component={ComplaintsScreen}
        options={{ title: nav.stacks.complaints }}
      />
      <Stack.Screen
        name="ComplaintDetail"
        component={ComplaintDetailScreen}
        options={{ title: nav.stacks.complaintDetail }}
      />
    </Stack.Navigator>
  );
}
