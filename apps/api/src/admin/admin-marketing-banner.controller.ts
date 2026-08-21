import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateMarketingBannerDto } from '../marketing/dto/update-marketing-banner.dto';
import { MarketingBannerService } from '../marketing/marketing-banner.service';

@Controller('admin/marketing-banner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminMarketingBannerController {
  constructor(private readonly banners: MarketingBannerService) {}

  @Get()
  getBanner() {
    return this.banners.getAdminConfig();
  }

  @Put()
  updateBanner(@Body() dto: UpdateMarketingBannerDto) {
    return this.banners.update(dto);
  }
}
