import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatOtpSmsMessage, OTP_SMS_TEXT_TYPE } from '@easymatch/shared';
import { SmsProvider } from './sms.provider';

const REQUEST_TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3;

type RtcomSendResponse = {
  response?: {
    code?: number;
    message?: string;
    timestamp?: string;
  };
  info?: {
    request?: string;
    requestID?: string;
    smsCharge?: string;
    balance?: string;
  };
};

@Injectable()
export class RtcomSmsProvider implements SmsProvider {
  private readonly logger = new Logger(RtcomSmsProvider.name);

  constructor(private readonly config: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const url = this.read('SMS_RTCOM_URL') || 'https://api.rtcom.xyz/onetomany';
    const acode = this.read('SMS_RTCOM_ACODE');
    const apiKey = this.read('SMS_RTCOM_API_KEY');
    const senderid = this.read('SMS_RTCOM_SENDER_ID');

    if (!acode || !apiKey || !senderid) {
      throw new ServiceUnavailableException(
        'SMS provider is not configured (SMS_RTCOM_ACODE, SMS_RTCOM_API_KEY, SMS_RTCOM_SENDER_ID)',
      );
    }

    const body = {
      acode,
      api_key: apiKey,
      senderid,
      type: OTP_SMS_TEXT_TYPE,
      msg: formatOtpSmsMessage(code, {
        androidAppHash: this.read('SMS_ANDROID_APP_HASH'),
      }),
      contacts: phone,
      transactionType: this.read('SMS_RTCOM_TRANSACTION_TYPE') || 'T',
      contentID: '',
    };
    const payload = JSON.stringify(body);

    let lastNetworkError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const result = await this.postOnce(url, payload);
        if (result.ok) {
          return;
        }
        this.logger.error(
          `RTCom SMS rejected for ${phone}: ${result.message} (${result.code}) requestID=${result.requestId}`,
        );
        throw new ServiceUnavailableException(
          'Could not send the verification SMS. Please try again.',
        );
      } catch (err) {
        if (err instanceof ServiceUnavailableException) {
          throw err;
        }
        lastNetworkError = err;
        this.logger.warn(
          `RTCom SMS network error for ${phone} attempt ${attempt}/${MAX_ATTEMPTS}: ${describeNetworkError(err)}`,
        );
        if (attempt < MAX_ATTEMPTS) {
          await sleep(400 * attempt);
        }
      }
    }

    this.logger.error(
      `RTCom SMS request failed for ${phone}: ${describeNetworkError(lastNetworkError)}`,
    );
    throw new ServiceUnavailableException(
      'Could not send the verification SMS. Please try again.',
    );
  }

  private async postOnce(
    url: string,
    payload: string,
  ): Promise<
    | { ok: true }
    | { ok: false; code: string; message: string; requestId: string }
  > {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const parsed = (await res.json()) as RtcomSendResponse;
    const codeStatus = parsed.response?.code;
    if (codeStatus !== 200) {
      return {
        ok: false,
        code: String(codeStatus ?? `http-${res.status}`),
        message: parsed.response?.message ?? 'unknown error',
        requestId: parsed.info?.requestID ?? 'n/a',
      };
    }

    this.logger.log(
      `RTCom SMS accepted http=${res.status} code=${codeStatus} message=${parsed.response?.message ?? 'n/a'} timestamp=${parsed.response?.timestamp ?? 'n/a'} requestID=${parsed.info?.requestID ?? 'n/a'} smsCharge=${parsed.info?.smsCharge ?? 'n/a'} balance=${parsed.info?.balance ?? 'n/a'}`,
    );
    return { ok: true };
  }

  private read(key: string): string {
    return (this.config.get<string>(key) ?? process.env[key] ?? '').trim();
  }
}

function describeNetworkError(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const parts = [err.name, err.message];
  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = (cause as Error & { code?: string }).code;
    parts.push(cause.message);
    if (code) {
      parts.push(code);
    }
  } else if (cause) {
    parts.push(String(cause));
  }
  return parts.filter(Boolean).join(' | ');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
