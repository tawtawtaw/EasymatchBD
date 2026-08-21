import { Module } from '@nestjs/common';
import { MarketingBannerService } from './marketing-banner.service';
import { MarketingController } from './marketing.controller';

@Module({
  controllers: [MarketingController],
  providers: [MarketingBannerService],
  exports: [MarketingBannerService],
})
export class MarketingModule {}
