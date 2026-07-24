import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@easymatch/shared';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StaffAuditService } from '../audit/staff-audit.service';
import { parseDiscoveryFilters } from '../discovery/discovery-filters';
import { AdminBiodataCsvExportService } from './admin-biodata-csv-export.service';
import {
  AdminProfilesService,
  type AdminProfileKind,
} from './admin-profiles.service';

const ADMIN_PROFILE_VIEW_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.VERIFICATION_OFFICER,
] as const;

@Controller('admin/profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_PROFILE_VIEW_ROLES)
export class AdminProfilesController {
  constructor(
    private readonly adminProfiles: AdminProfilesService,
    private readonly biodataCsvExport: AdminBiodataCsvExportService,
    private readonly staffAudit: StaffAuditService,
  ) {}

  @Get('export.csv')
  @Roles(UserRole.SUPER_ADMIN)
  async exportBiodataCsv(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ) {
    const filters = parseDiscoveryFilters(query);
    const locale = query.locale?.trim() === 'bn' ? 'bn' : 'en';
    const { csv, rowCount, truncated } =
      await this.biodataCsvExport.exportCsv(filters, locale);
    await this.staffAudit.logBiodataCsvExport(user, filters, rowCount, truncated);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `easymatch-biodata-${filters.gender}-${stamp}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Row-Count', String(rowCount));
    res.setHeader('X-Export-Truncated', truncated ? 'true' : 'false');
    res.send(csv);
  }

  @Get('members/:profileId')
  getMemberProfile(@Param('profileId') profileId: string) {
    return this.adminProfiles.getMemberProfile(profileId);
  }

  @Get('staff/:userId')
  getStaffProfile(@Param('userId') userId: string) {
    return this.adminProfiles.getStaffProfile(userId);
  }

  @Get()
  listProfiles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('kind') kind?: AdminProfileKind | 'all',
    @Query('role') role?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.adminProfiles.listProfiles({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      kind: kind === 'member' || kind === 'staff' || kind === 'all' ? kind : 'all',
      role,
      includeInactive: includeInactive === 'true' || includeInactive === '1',
    });
  }
}
