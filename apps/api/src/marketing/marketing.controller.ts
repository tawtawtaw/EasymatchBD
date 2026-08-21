import { Controller, Get } from '@nestjs/common';
import { MarketingBannerService } from './marketing-banner.service';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly banners: MarketingBannerService) {}

  @Get('banner')
  getBanner() {
    return this.banners.getPublicBanner();
  }
}
