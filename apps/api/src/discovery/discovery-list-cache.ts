type DiscoveryListCacheInvalidator = (userId: string) => void;

let invalidator: DiscoveryListCacheInvalidator | null = null;

export function registerDiscoveryListCacheInvalidator(
  fn: DiscoveryListCacheInvalidator,
) {
  invalidator = fn;
}

export function invalidateDiscoveryListCache(userId: string) {
  invalidator?.(userId);
}
