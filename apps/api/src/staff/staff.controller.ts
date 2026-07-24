import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { isStaffRole } from '@easymatch/shared';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarkStaffNotificationsReadDto } from './dto/mark-staff-notifications-read.dto';
import { StaffAlertsService } from './staff-alerts.service';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffAlerts: StaffAlertsService) {}

  private assertStaff(user: AuthUser) {
    if (!isStaffRole(user.role)) {
      throw new ForbiddenException('Staff access required');
    }
  }

  @Get('alerts-summary')
  getAlertsSummary(@CurrentUser() user: AuthUser) {
    this.assertStaff(user);
    return this.staffAlerts.getSummary(user.id, user.role);
  }

  @Get('notifications')
  listNotifications(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    this.assertStaff(user);
    const parsed = limit ? Number(limit) : 20;
    return this.staffAlerts.listNotifications(
      user.id,
      user.role,
      Number.isFinite(parsed) ? parsed : 20,
    );
  }

  @Post('notifications/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Body() body: MarkStaffNotificationsReadDto,
  ) {
    this.assertStaff(user);
    return this.staffAlerts.markRead(user.id, user.role, body.ids);
  }

  @Post('notifications/read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    this.assertStaff(user);
    return this.staffAlerts.markAllRead(user.id, user.role);
  }
}
