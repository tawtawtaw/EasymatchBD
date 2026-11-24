import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSmsProvider } from './create-sms-provider';
import { SMS_PROVIDER } from './sms.provider';

@Global()
@Module({
  providers: [
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService],
      useFactory: createSmsProvider,
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
