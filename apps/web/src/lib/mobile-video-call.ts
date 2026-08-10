export type MobileVideoCallState =
  | "loading"
  | "ringing"
  | "joining"
  | "connecting"
  | "active"
  | "needs_media_tap"
  | "ended";

export function notifyMobileVideoCallState(
  status: MobileVideoCallState,
  extra?: Record<string, string>,
): void {
  const payload = JSON.stringify({
    type: "video_call",
    status,
    ...extra,
  });
  const bridge = (
    window as Window & {
      ReactNativeWebView?: { postMessage: (message: string) => void };
    }
  ).ReactNativeWebView;
  bridge?.postMessage(payload);
}

export function notifyMobileVideoCallMediaState(
  micEnabled: boolean,
  cameraEnabled: boolean,
): void {
  const bridge = (
    window as Window & {
      ReactNativeWebView?: { postMessage: (message: string) => void };
    }
  ).ReactNativeWebView;
  bridge?.postMessage(
    JSON.stringify({
      type: "video_call_media",
      micEnabled,
      cameraEnabled,
    }),
  );
}

/** Hands a guest link to the native share sheet. Returns false on the web. */
export function shareViaNativeShell(url: string, title?: string): boolean {
  const bridge = (
    window as Window & {
      ReactNativeWebView?: { postMessage: (message: string) => void };
    }
  ).ReactNativeWebView;
  if (!bridge) return false;

  bridge.postMessage(JSON.stringify({ type: "video_call_share", url, title }));
  return true;
}

export function isNativeVideoCallShell(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.search.includes("nativeShell=1") ||
    document.documentElement.dataset.easymatchNativeCall === "1"
  );
}
