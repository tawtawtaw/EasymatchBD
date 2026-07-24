import * as FileSystem from "expo-file-system/legacy";
import { API_BASE_URL } from "../services/api/client";
import { sessionStorage } from "../services/session-storage";

function cacheFileForPath(path: string) {
  const safe = path.replace(/[^\w.-]+/g, "_");
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  return `${base}auth-image-${safe}`;
}

export async function fetchAuthenticatedImageDataUri(
  path: string,
): Promise<string | null> {
  try {
    const token = await sessionStorage.getAccessToken();
    if (!token) return null;

    const cacheFile = cacheFileForPath(path);
    const result = await FileSystem.downloadAsync(`${API_BASE_URL}${path}`, cacheFile, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.status !== 200) return null;

    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const mimeType =
      result.headers?.["Content-Type"] ??
      result.headers?.["content-type"] ??
      "image/jpeg";

    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}
