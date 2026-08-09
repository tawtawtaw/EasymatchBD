import { AUTH_TOKEN_KEY } from "../constants/storage-keys";

export const MOBILE_APP_SESSION_KEY = "easymatch_mobile_app";

type BootstrapOptions = {
  accessToken: string;
  apiBaseUrl?: string;
  markMobileAppSession?: boolean;
  /** Forward page warnings/errors to the native console (dev builds only). */
  forwardConsole?: boolean;
};

/** Runs before page JS so the web app can authenticate and reach the API from a WebView. */
export function buildWebViewBootstrapScript({
  accessToken,
  apiBaseUrl,
  markMobileAppSession = true,
  forwardConsole = false,
}: BootstrapOptions): string {
  const tokenLiteral = JSON.stringify(accessToken);
  const authKeyLiteral = JSON.stringify(AUTH_TOKEN_KEY);
  const mobileKeyLiteral = JSON.stringify(MOBILE_APP_SESSION_KEY);
  const apiUrlLiteral = apiBaseUrl ? JSON.stringify(apiBaseUrl) : "null";

  const consoleBridge = forwardConsole
    ? `
      try {
        var __post = function (level, args) {
          try {
            var text = Array.prototype.map
              .call(args, function (arg) {
                if (arg instanceof Error) return arg.message + " " + (arg.stack || "");
                if (typeof arg === "object") {
                  try { return JSON.stringify(arg); } catch (e) { return String(arg); }
                }
                return String(arg);
              })
              .join(" ");
            window.ReactNativeWebView &&
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "webview_log", level: level, text: text }),
              );
          } catch (e) {}
        };
        ["warn", "error"].forEach(function (level) {
          var original = console[level];
          console[level] = function () {
            __post(level, arguments);
            if (original) original.apply(console, arguments);
          };
        });
        window.addEventListener("error", function (event) {
          __post("error", [event.message, event.filename + ":" + event.lineno]);
        });
        window.addEventListener("unhandledrejection", function (event) {
          __post("error", ["unhandledrejection", event.reason]);
        });
      } catch (e) {}
    `
    : "";

  return `
    (function () {
      ${consoleBridge}
      try {
        localStorage.setItem(${authKeyLiteral}, ${tokenLiteral});
      } catch (e) {}
      try {
        if (${apiUrlLiteral}) {
          window.__EASYMATCH_API_BASE_URL__ = ${apiUrlLiteral};
        }
      } catch (e) {}
      try {
        if (${markMobileAppSession ? "true" : "false"}) {
          sessionStorage.setItem(${mobileKeyLiteral}, "1");
        }
        document.documentElement.dataset.easymatchNativeCall = "1";
        window.__easymatchNativeCommandQueue = window.__easymatchNativeCommandQueue || [];
        function __easymatchHandleNativeCmdMessage(raw) {
          if (typeof raw !== "string" || !raw) return;
          try {
            var data = JSON.parse(raw);
            if (data.type !== "native_call_cmd" || !data.cmd) return;
            if (window.__easymatchRunNativeCommand && window.__easymatchRunNativeCommand(data.cmd)) {
              return;
            }
            window.__easymatchNativeCommandQueue.push(data.cmd);
          } catch (e) {}
        }
        window.addEventListener("message", function (event) {
          __easymatchHandleNativeCmdMessage(event.data);
        });
        document.addEventListener("message", function (event) {
          __easymatchHandleNativeCmdMessage(event.data);
        });
      } catch (e) {}
    })();
    true;
  `;
}
