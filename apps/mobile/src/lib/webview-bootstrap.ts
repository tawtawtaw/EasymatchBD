import { AUTH_TOKEN_KEY } from "../constants/storage-keys";

export const MOBILE_APP_SESSION_KEY = "easymatch_mobile_app";

type BootstrapOptions = {
  accessToken: string;
  apiBaseUrl?: string;
  markMobileAppSession?: boolean;
};

/** Runs before page JS so the web app can authenticate and reach the API from a WebView. */
export function buildWebViewBootstrapScript({
  accessToken,
  apiBaseUrl,
  markMobileAppSession = true,
}: BootstrapOptions): string {
  const tokenLiteral = JSON.stringify(accessToken);
  const authKeyLiteral = JSON.stringify(AUTH_TOKEN_KEY);
  const mobileKeyLiteral = JSON.stringify(MOBILE_APP_SESSION_KEY);
  const apiUrlLiteral = apiBaseUrl ? JSON.stringify(apiBaseUrl) : "null";

  return `
    (function () {
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
      } catch (e) {}
    })();
    true;
  `;
}
