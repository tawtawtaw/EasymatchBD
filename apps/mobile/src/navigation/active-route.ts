import { useEffect, useState } from "react";
import type { NavigationState, PartialState } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";

type NavState = NavigationState | PartialState<NavigationState>;

export function getDeepestRouteName(state: NavState | undefined): string | undefined {
  if (!state || !("routes" in state) || !state.routes?.length) return undefined;
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return undefined;
  if (route.state) return getDeepestRouteName(route.state as NavState);
  return route.name;
}

export function useActiveRouteName() {
  const [routeName, setRouteName] = useState<string | undefined>();

  useEffect(() => {
    const sync = () => {
      if (!navigationRef.isReady()) return;
      setRouteName(getDeepestRouteName(navigationRef.getRootState()));
    };
    sync();
    return navigationRef.addListener("state", sync);
  }, []);

  return routeName;
}

/** Screens with a bottom composer or full-screen controls — hide global FAB. */
export const WHATSAPP_FAB_HIDDEN_ROUTES = new Set(["ChatThread", "VideoCallRoom"]);
