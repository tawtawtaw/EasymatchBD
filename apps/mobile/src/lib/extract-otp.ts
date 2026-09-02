/** Pull the 6-digit English OTP out of a Bangla or English SMS body. */
export function extractOtpFromSms(message: string): string | null {
  const match = message.match(/(?<!\d)\d{6}(?!\d)/);
  return match?.[0] ?? null;
}
