import { LayoutAnimation, Platform, UIManager } from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** In-memory so returning from a profile screen still sees the same list instance. */
export const discoveryLeftMemory = {
  skippedIdsRef: new Set<string>(),
  pendingLeftRef: new Set<string>(),
};

export function animateDiscoveryListShift() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function markDiscoveryProfileLeft(profileId: string) {
  if (!profileId) return;
  discoveryLeftMemory.skippedIdsRef.add(profileId);
  discoveryLeftMemory.pendingLeftRef.add(profileId);
}

export function consumeDiscoveryProfilesLeft(): string[] {
  const ids = [...discoveryLeftMemory.pendingLeftRef];
  discoveryLeftMemory.pendingLeftRef.clear();
  return ids;
}

export function resetDiscoveryQueueSkips() {
  discoveryLeftMemory.skippedIdsRef.clear();
  discoveryLeftMemory.pendingLeftRef.clear();
}

export function rememberSkippedDiscoveryIds(ids: string[]) {
  for (const id of ids) {
    discoveryLeftMemory.skippedIdsRef.add(id);
  }
}
