import { sessionStorage } from "../services/session-storage";

let headersPromise: Promise<Record<string, string> | null> | null = null;

export function clearAuthImageHeadersCache() {
  headersPromise = null;
}

export function getAuthImageHeaders(): Promise<Record<string, string> | null> {
  if (!headersPromise) {
    headersPromise = sessionStorage.getAccessToken().then((token) => {
      if (!token) return null;
      return { Authorization: `Bearer ${token}` };
    });
  }
  return headersPromise;
}
