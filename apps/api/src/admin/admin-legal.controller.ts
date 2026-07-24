import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PublishTermsDto } from '../legal/dto/save-terms-draft.dto';
import { SaveTermsDraftDto } from '../legal/dto/save-terms-draft.dto';
import { ScheduleTermsPublishDto } from '../legal/dto/schedule-terms-publish.dto';
import { LegalService } from '../legal/legal.service';

@Controller('admin/legal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminLegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('terms')
  getTermsState() {
    return this.legalService.getAdminState();
  }

  @Get('terms/preview')
  getDraftPreview(@Query('locale') locale?: string) {
    return this.legalService.getDraftPreview(locale === 'bn' ? 'bn' : 'en');
  }

  @Get('terms/audit-log')
  getAuditLog() {
    return this.legalService.getAuditLog();
  }

  @Put('terms')
  saveDraft(@Body() dto: SaveTermsDraftDto) {
    return this.legalService.saveDraft(dto);
  }

  @Post('terms/publish')
  publish(@CurrentUser() user: AuthUser, @Body() dto: PublishTermsDto) {
    return this.legalService.publish(dto.version, user.id);
  }

  @Post('terms/schedule')
  schedulePublish(
    @CurrentUser() user: AuthUser,
    @Body() dto: ScheduleTermsPublishDto,
  ) {
    return this.legalService.schedulePublish(dto.scheduledPublishAt, user.id);
  }

  @Post('terms/cancel-schedule')
  cancelSchedule(@CurrentUser() user: AuthUser) {
    return this.legalService.cancelScheduledPublish(user.id);
  }

  @Post('terms/discard-draft')
  discardDraft() {
    return this.legalService.discardDraft();
  }
}
