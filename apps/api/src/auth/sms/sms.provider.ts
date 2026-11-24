export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
  /** Optional transactional SMS (invites, notices). Falls back to OTP channel when omitted. */
  sendText?(phone: string, message: string): Promise<void>;
}
