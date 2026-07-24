export const MOBILE_APP_SESSION_KEY = "easymatch_mobile_app";

export function markMobileAppSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(MOBILE_APP_SESSION_KEY, "1");
}

export function isMobileAppSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(MOBILE_APP_SESSION_KEY) === "1";
}
