import * as FileSystem from "expo-file-system/legacy";
import { config } from "../../config/env";
import { ApiError, messageFromApiErrorPayload, readApiError } from "../../lib/api-error";
import { normalizeUploadMime, withFileScheme } from "../../lib/media-capture";
import { sessionStorage } from "../session-storage";

const BOOTSTRAP_TIMEOUT_MS = 8_000;

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  auth?: boolean;
  timeoutMs?: number;
};

async function buildHeaders(options: RequestOptions): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.apiBaseUrl.includes("ngrok")
      ? { "ngrok-skip-browser-warning": "1" }
      : {}),
    ...options.headers,
  };

  if (options.auth !== false) {
    const token = await sessionStorage.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? config.requestTimeoutMs;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      ...options,
      cache: "no-store",
      headers: await buildHeaders(options),
      signal: controller.signal,
    });
    if (__DEV__ && (path.includes("/discovery/") || path.includes("/profiles/me") || path.includes("/push-token"))) {
      console.info(`[api] ${response.status} ${path} ${Date.now() - startedAt}ms`);
    }

    if (!response.ok) {
      if (response.status === 401 && options.auth !== false) {
        await sessionStorage.clearAccessToken();
      }
      throw new ApiError(await readApiError(response), response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Could not reach the server. Check the API is running and EXPO_PUBLIC_API_URL in .env");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const API_BASE_URL = config.apiBaseUrl;
export const BOOTSTRAP_API_TIMEOUT_MS = BOOTSTRAP_TIMEOUT_MS;

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: { auth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? Math.max(config.requestTimeoutMs, 90_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      ...(config.apiBaseUrl.includes("ngrok")
        ? { "ngrok-skip-browser-warning": "1" }
        : {}),
    };

    if (options.auth !== false) {
      const token = await sessionStorage.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 && options.auth !== false) {
        await sessionStorage.clearAccessToken();
      }
      throw new ApiError(await readApiError(response), response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Could not reach the server. Check the API is running and EXPO_PUBLIC_API_URL in .env");
    }
    if (
      error instanceof Error &&
      /network request failed/i.test(error.message)
    ) {
      throw new Error(
        "Could not upload this photo. Check your connection and try again, or choose a smaller photo from the gallery.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiUploadFile<T>(
  path: string,
  file: { uri: string; name: string; type: string },
  options: { auth?: boolean; fieldName?: string; timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? Math.max(config.requestTimeoutMs, 90_000);
  const fileUri = withFileScheme(file.uri);
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || info.isDirectory || info.size <= 0) {
    throw new Error(
      "Could not upload this photo. The camera file was no longer available. Please take the photo again.",
    );
  }

  const headers: Record<string, string> = {
    ...(config.apiBaseUrl.includes("ngrok")
      ? { "ngrok-skip-browser-warning": "1" }
      : {}),
  };
  if (options.auth !== false) {
    const token = await sessionStorage.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const task = FileSystem.createUploadTask(`${config.apiBaseUrl}${path}`, fileUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: options.fieldName ?? "file",
    mimeType: normalizeUploadMime(file.type, file.name),
    headers,
    sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
  });
  const timeout = setTimeout(() => {
    void task.cancelAsync();
  }, timeoutMs);

  let result: Awaited<ReturnType<typeof FileSystem.uploadAsync>> | undefined | null;
  try {
    result = await task.uploadAsync();
  } catch (error) {
    if (
      error instanceof Error &&
      /network request failed|cancelled|canceled|abort/i.test(error.message)
    ) {
      throw new Error(
        "Could not upload this photo. Check your connection and try again.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!result) {
    throw new Error("Could not upload this photo. Check your connection and try again.");
  }

  if (result.status === 401 && options.auth !== false) {
    await sessionStorage.clearAccessToken();
  }

  if (result.status < 200 || result.status >= 300) {
    let payload: unknown = result.body;
    try {
      payload = JSON.parse(result.body) as unknown;
    } catch {
      payload = result.body;
    }
    throw new ApiError(
      messageFromApiErrorPayload(payload, result.status),
      result.status,
    );
  }

  try {
    return JSON.parse(result.body) as T;
  } catch {
    throw new Error(
      "Could not upload this photo. The server returned an unexpected response.",
    );
  }
}
