type HomeBootstrapCacheInvalidator = (userId: string) => void;

let invalidator: HomeBootstrapCacheInvalidator | null = null;

export function registerHomeBootstrapCacheInvalidator(
  fn: HomeBootstrapCacheInvalidator,
) {
  invalidator = fn;
}

export function invalidateHomeBootstrapCache(userId: string) {
  invalidator?.(userId);
}
