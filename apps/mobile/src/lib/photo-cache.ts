import * as FileSystem from "expo-file-system/legacy";
import { sessionStorage } from "../services/session-storage";

const CACHE_DIR = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}easymatch-photos/`;

const inflight = new Map<string, Promise<string>>();

function cachePathFor(cacheKey: string): string {
  const safe = cacheKey.replace(/[^\w.-]+/g, "_").slice(0, 180);
  return `${CACHE_DIR}${safe}`;
}

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

export async function ensureLocalPhoto(
  remoteUri: string,
  cacheKey: string,
): Promise<string> {
  const path = cachePathFor(cacheKey);
  const existing = inflight.get(path);
  if (existing) return existing;

  const request = (async () => {
    await ensureCacheDir();
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists && "size" in info && (info.size ?? 0) > 0) {
      return path;
    }

    const token = await sessionStorage.getAccessToken();
    if (!token) {
      throw new Error("Missing auth token");
    }

    const result = await FileSystem.downloadAsync(remoteUri, path, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.status !== 200) {
      await FileSystem.deleteAsync(path, { idempotent: true });
      throw new Error(`Image request failed (${result.status})`);
    }

    return result.uri;
  })();

  inflight.set(path, request);
  try {
    return await request;
  } finally {
    inflight.delete(path);
  }
}

export function prefetchPhotos(
  items: Array<{ remoteUri: string; cacheKey: string }>,
) {
  for (const item of items) {
    void ensureLocalPhoto(item.remoteUri, item.cacheKey).catch(() => undefined);
  }
}

export async function clearPhotoCache(): Promise<void> {
  inflight.clear();
  await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
}

export async function clearCachedPhoto(cacheKey: string): Promise<void> {
  const path = cachePathFor(cacheKey);
  inflight.delete(path);
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export async function clearPhotoCacheForProfile(profileId: string): Promise<void> {
  const prefix = cachePathFor(`${profileId}_`).replace(/_$/, "_");
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) return;
  const names = await FileSystem.readDirectoryAsync(CACHE_DIR);
  await Promise.all(
    names
      .filter((name) => `${CACHE_DIR}${name}`.startsWith(prefix) || name.startsWith(profileId.replace(/[^\w.-]+/g, "_")))
      .map((name) => FileSystem.deleteAsync(`${CACHE_DIR}${name}`, { idempotent: true })),
  );
}

export function photoCacheKey(
  profileId: string,
  photoId: string,
  variant: string,
): string {
  return `${profileId}_${photoId}_${variant}`;
}
