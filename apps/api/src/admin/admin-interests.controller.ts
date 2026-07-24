import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminInterestsService,
  type AdminInterestFilter,
} from './admin-interests.service';

@Controller('admin/interests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_OFFICER)
export class AdminInterestsController {
  constructor(private readonly adminInterests: AdminInterestsService) {}

  @Get()
  listRelationships(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('filter') filter?: AdminInterestFilter,
  ) {
    const validFilters: AdminInterestFilter[] = [
      'all',
      'pending',
      'connected',
      'declined',
    ];
    return this.adminInterests.listRelationships({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      filter: validFilters.includes(filter as AdminInterestFilter)
        ? (filter as AdminInterestFilter)
        : 'all',
    });
  }
}
