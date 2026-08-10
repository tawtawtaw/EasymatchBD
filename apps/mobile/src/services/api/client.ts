import { config } from "../../config/env";
import { ApiError, readApiError } from "../../lib/api-error";
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
  const timeoutMs = options.timeoutMs ?? config.requestTimeoutMs;
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
      cache: "no-store",
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
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
