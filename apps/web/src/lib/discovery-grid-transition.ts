import { flushSync } from "react-dom";

/** Animate discovery cards into their new grid seats after one leaves. */
export function runDiscoveryGridTransition(update: () => void) {
  if (typeof document === "undefined") {
    update();
    return;
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startViewTransition = document.startViewTransition?.bind(document);
  if (reduced || !startViewTransition) {
    update();
    return;
  }

  startViewTransition(() => {
    flushSync(update);
  });
}

export function discoveryCardTransitionName(profileCode: string) {
  const safe = profileCode.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `discovery-card-${safe}`;
}

const LEFT_CODES_KEY = "easymatch_discovery_left_codes";

export function markDiscoveryProfileLeft(profileCode: string) {
  if (typeof sessionStorage === "undefined" || !profileCode) return;
  let codes: string[] = [];
  try {
    const existing = sessionStorage.getItem(LEFT_CODES_KEY);
    const parsed = existing ? (JSON.parse(existing) as unknown) : [];
    if (Array.isArray(parsed)) {
      codes = parsed.filter((code): code is string => typeof code === "string");
    }
  } catch {
    codes = [];
  }
  if (!codes.includes(profileCode)) {
    codes.push(profileCode);
    sessionStorage.setItem(LEFT_CODES_KEY, JSON.stringify(codes));
  }
}

export function consumeDiscoveryProfilesLeft(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  const raw = sessionStorage.getItem(LEFT_CODES_KEY);
  sessionStorage.removeItem(LEFT_CODES_KEY);
  if (!raw) return [];
  try {
    const codes = JSON.parse(raw) as unknown;
    return Array.isArray(codes)
      ? codes.filter((code): code is string => typeof code === "string")
      : [];
  } catch {
    return [];
  }
}
