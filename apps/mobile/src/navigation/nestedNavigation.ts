import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";

type StackRoute = {
  name: string;
  params?: object;
};

function stackState(routes: StackRoute[]) {
  return {
    state: {
      routes,
      index: routes.length - 1,
    },
  };
}

/** Ensures a tab's stack root screen sits below the target so the header back button appears. */
export function navigateTabStack(
  navigation: NavigationProp<ParamListBase>,
  tabName: string,
  routes: StackRoute[],
) {
  navigation.navigate(tabName, stackState(routes));
}

export function navigateToDiscoveryProfile(
  navigation: NavigationProp<ParamListBase>,
  params: { profileId: string; profileCode: string },
) {
  navigateTabStack(navigation, "Discovery", [
    { name: "DiscoveryList" },
    { name: "DiscoveryProfile", params },
  ]);
}

export function navigateToChatThread(
  navigation: NavigationProp<ParamListBase>,
  params: {
    connectionId: string;
    memberName: string;
    profileCode: string | null;
  },
) {
  navigateTabStack(navigation, "Messages", [
    { name: "MessagesList" },
    { name: "ChatThread", params },
  ]);
}

export function navigateToProfileScreen(screen: string, params?: object) {
  if (!navigationRef.isReady()) return false;

  const routes: StackRoute[] = [{ name: "ProfileHome" }];
  if (screen !== "ProfileHome") {
    routes.push({ name: screen, params });
  }

  navigationRef.navigate("Main", {
    screen: "Profile",
    params: stackState(routes),
  });
  return true;
}

export function navigateToComplaints(params?: {
  profileCode?: string;
  openForm?: boolean;
}) {
  return navigateToProfileScreen("Complaints", params);
}

export function navigateToSettings() {
  return navigateToProfileScreen("Settings");
}
