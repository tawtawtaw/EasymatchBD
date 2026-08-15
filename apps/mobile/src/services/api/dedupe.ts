const inflightRequests = new Map<string, Promise<unknown>>();
const recentResponses = new Map<string, { expiresAt: number; value: unknown }>();
const keyGenerations = new Map<string, number>();

function bumpGeneration(key: string) {
  keyGenerations.set(key, (keyGenerations.get(key) ?? 0) + 1);
}

export async function dedupeRequest<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = 1_500,
): Promise<T> {
  const now = Date.now();
  const cached = recentResponses.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const generation = keyGenerations.get(key) ?? 0;
  const request = loader()
    .then((value) => {
      if (
        inflightRequests.get(key) === request &&
        (keyGenerations.get(key) ?? 0) === generation
      ) {
        recentResponses.set(key, { expiresAt: Date.now() + ttlMs, value });
      }
      return value;
    })
    .finally(() => {
      if (inflightRequests.get(key) === request) {
        inflightRequests.delete(key);
      }
    });

  inflightRequests.set(key, request as Promise<unknown>);
  return request;
}

export function invalidateDedupeCache(keyPrefix?: string) {
  const keys = new Set<string>();
  for (const key of recentResponses.keys()) {
    if (!keyPrefix || key.startsWith(keyPrefix)) keys.add(key);
  }
  for (const key of inflightRequests.keys()) {
    if (!keyPrefix || key.startsWith(keyPrefix)) keys.add(key);
  }
  for (const key of keyGenerations.keys()) {
    if (!keyPrefix || key.startsWith(keyPrefix)) keys.add(key);
  }
  for (const key of keys) {
    recentResponses.delete(key);
    inflightRequests.delete(key);
    bumpGeneration(key);
  }
}
