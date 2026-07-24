import { clearAuthSession } from "@/lib/auth-session";

export const MOBILE_CHECKOUT_SESSION_KEY = "easymatch_mobile_checkout";

export function markMobileCheckoutSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(MOBILE_CHECKOUT_SESSION_KEY, "1");
}

export function isMobileCheckoutSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(MOBILE_CHECKOUT_SESSION_KEY) === "1";
}

export function closeMobileCheckoutWebSession(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(MOBILE_CHECKOUT_SESSION_KEY);
  }
  clearAuthSession();
}

type MobileCheckoutOutcome = "success" | "fail" | "cancel";

export function notifyMobileAppCheckoutComplete(outcome: MobileCheckoutOutcome): void {
  const payload = JSON.stringify({
    type: "membership_checkout",
    outcome,
  });
  const bridge = (
    window as Window & {
      ReactNativeWebView?: { postMessage: (message: string) => void };
    }
  ).ReactNativeWebView;
  bridge?.postMessage(payload);
}
