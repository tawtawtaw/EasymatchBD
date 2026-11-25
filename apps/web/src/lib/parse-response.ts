import { EASYMATCH_API_PORT } from "@easymatch/shared";

type ApiErrorBody = {
  message?: string | string[];
  statusCode?: number;
};

export async function apiFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, {
      cache: "no-store",
      ...init,
    });
  } catch {
    const isLocalDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    throw new Error(
      isLocalDev
        ? `Cannot reach the API server. Make sure both apps are running (npm run dev) and the API is on http://localhost:${EASYMATCH_API_PORT}`
        : "Cannot reach the API server. The API may be restarting — try again in a minute.",
    );
  }
}

export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(
        `Request failed (${res.status}${res.statusText ? ` ${res.statusText}` : ""})`,
      );
    }
    throw new Error(
      "Empty response from the API. Restart the dev servers (npm run dev) and try again.",
    );
  }

  let data: T & ApiErrorBody;
  try {
    data = JSON.parse(text) as T & ApiErrorBody;
  } catch {
    const preview = text.trim().slice(0, 120).replace(/\s+/g, " ");
    const isLocalDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    if (preview.startsWith("Internal") && isLocalDev) {
      throw new Error(
        `Cannot reach the API server. Start both dev apps from the repo root (npm run dev), or run npm run dev:api — API should listen on http://localhost:${EASYMATCH_API_PORT}`,
      );
    }
    throw new Error(
      preview.startsWith("Internal")
        ? "The server encountered an error. Please try again in a moment."
        : `Invalid response from the API (${res.status}). The server may be unavailable or still restarting.`,
    );
  }

  if (!res.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}
