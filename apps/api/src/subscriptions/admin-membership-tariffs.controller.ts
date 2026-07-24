import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BulkUpdateMembershipTariffsDto } from './dto/bulk-update-membership-tariffs.dto';
import { MembershipTariffsService } from './membership-tariffs.service';

@Controller('admin/membership-tariffs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminMembershipTariffsController {
  constructor(private readonly tariffs: MembershipTariffsService) {}

  @Get()
  listTariffs() {
    return this.tariffs.listAll();
  }

  @Put()
  bulkUpdate(@Body() dto: BulkUpdateMembershipTariffsDto) {
    return this.tariffs.bulkUpdate(dto.tariffs);
  }
}
