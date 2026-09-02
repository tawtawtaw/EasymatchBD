import { ConfigService } from '@nestjs/config';
import { ConsoleSmsProvider } from './console-sms.provider';
import { RtcomSmsProvider } from './rtcom-sms.provider';
import type { SmsProvider } from './sms.provider';

export function createSmsProvider(config: ConfigService): SmsProvider {
  const name = (
    config.get<string>('SMS_PROVIDER') ??
    process.env.SMS_PROVIDER ??
    'console'
  )
    .trim()
    .toLowerCase();

  if (name === 'rtcom') {
    return new RtcomSmsProvider(config);
  }

  return new ConsoleSmsProvider();
}
