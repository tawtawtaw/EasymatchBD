import { useSyncExternalStore } from "react";
import type { NavigationState, PartialState } from "@react-navigation/native";

type NavState = NavigationState | PartialState<NavigationState>;

export function getDeepestRouteName(state: NavState | undefined): string | undefined {
  if (!state || !("routes" in state) || !state.routes?.length) return undefined;
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return undefined;
  if (route.state) return getDeepestRouteName(route.state as NavState);
  return route.name;
}

let currentRouteName: string | undefined;
const subscribers = new Set<() => void>();

/**
 * Fed by NavigationContainer itself rather than by a listener on the container
 * ref: a ref listener registered before the container mounts only survives on
 * exact timing, which silently broke consumers rendered outside the container.
 */
export function publishActiveRoute(state: NavState | undefined) {
  const next = getDeepestRouteName(state);
  if (next === currentRouteName) return;
  currentRouteName = next;
  for (const notify of subscribers) notify();
}

function subscribe(onChange: () => void) {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

export function useActiveRouteName() {
  return useSyncExternalStore(
    subscribe,
    () => currentRouteName,
    () => currentRouteName,
  );
}

/** Screens with a bottom composer or full-screen controls — hide global FAB. */
export const WHATSAPP_FAB_HIDDEN_ROUTES = new Set(["ChatThread", "VideoCallRoom"]);
