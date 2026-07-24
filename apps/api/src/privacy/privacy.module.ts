import { Module } from '@nestjs/common';
import { PrivacyFieldsService } from './privacy-fields.service';

@Module({
  providers: [PrivacyFieldsService],
  exports: [PrivacyFieldsService],
})
export class PrivacyModule {}
