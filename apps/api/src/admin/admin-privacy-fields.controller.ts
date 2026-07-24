import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import { BulkUpdatePrivacyFieldsDto } from './dto/bulk-update-privacy-fields.dto';

@Controller('admin/privacy-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminPrivacyFieldsController {
  constructor(private readonly privacyFields: PrivacyFieldsService) {}

  @Get()
  listFields() {
    return this.privacyFields.listAll();
  }

  @Put()
  bulkUpdate(@Body() dto: BulkUpdatePrivacyFieldsDto) {
    return this.privacyFields.bulkUpdate(dto.fields);
  }
}
