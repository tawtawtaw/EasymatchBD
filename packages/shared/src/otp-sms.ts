/** RTCom / most BD gateways need Unicode mode for Bangla SMS. */
export const OTP_SMS_TEXT_TYPE = "unicode" as const;

/**
 * Bangla body with English digits. Keep this short so Android SMS Retriever
 * can still add the 11-character app hash within one SMS.
 */
export function formatOtpSmsMessage(
  code: string,
  options?: { androidAppHash?: string | null },
): string {
  const body = `ইজিম্যাচবিডি ওটিপি ${code} যা 5 মিনিটের মধ্যে মেয়াদ উত্তীর্ণ হবে`;
  const hash = options?.androidAppHash?.trim();
  if (!hash) {
    return body;
  }
  return `<#> ${body}\n${hash}`;
}
