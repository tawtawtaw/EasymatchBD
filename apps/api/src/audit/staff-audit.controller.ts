import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { StaffActivityCategory } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StaffAuditService } from './staff-audit.service';

@Controller('admin/audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class StaffAuditController {
  constructor(private readonly audit: StaffAuditService) {}

  @Get()
  list(
    @Query('category') category?: string,
    @Query('actorId') actorId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedCategory =
      category &&
      Object.values(StaffActivityCategory).includes(
        category as StaffActivityCategory,
      )
        ? (category as StaffActivityCategory)
        : undefined;

    return this.audit.listForAdmin({
      category: parsedCategory,
      actorId: actorId?.trim() || undefined,
      limit: limit ? Number(limit) : undefined,
      cursor: cursor?.trim() || undefined,
    });
  }
}
