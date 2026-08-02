const inflightRequests = new Map<string, Promise<unknown>>();
const recentResponses = new Map<string, { expiresAt: number; value: unknown }>();

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

  const request = loader()
    .then((value) => {
      if (inflightRequests.get(key) === request) {
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
  if (!keyPrefix) {
    recentResponses.clear();
    inflightRequests.clear();
    return;
  }
  for (const key of recentResponses.keys()) {
    if (key.startsWith(keyPrefix)) {
      recentResponses.delete(key);
    }
  }
  for (const key of inflightRequests.keys()) {
    if (key.startsWith(keyPrefix)) {
      inflightRequests.delete(key);
    }
  }
}
