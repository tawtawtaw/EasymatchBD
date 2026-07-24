import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BulkUpdateConsultantTariffsDto } from './dto/bulk-update-consultant-tariffs.dto';
import { ConsultantTariffsService } from './consultant-tariffs.service';

@Controller('admin/consultant-tariffs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminConsultantTariffsController {
  constructor(private readonly tariffs: ConsultantTariffsService) {}

  @Get()
  listTariffs() {
    return this.tariffs.listAll();
  }

  @Put()
  bulkUpdate(@Body() dto: BulkUpdateConsultantTariffsDto) {
    return this.tariffs.bulkUpdate(dto.tariffs);
  }
}
