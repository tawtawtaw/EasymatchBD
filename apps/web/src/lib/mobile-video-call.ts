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

export function isNativeVideoCallShell(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.search.includes("nativeShell=1") ||
    document.documentElement.dataset.easymatchNativeCall === "1"
  );
}
