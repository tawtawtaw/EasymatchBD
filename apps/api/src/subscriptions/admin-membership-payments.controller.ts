import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminMembershipPaymentsService,
  type AdminPaymentFilter,
} from './admin-membership-payments.service';

@Controller('admin/membership-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminMembershipPaymentsController {
  constructor(private readonly payments: AdminMembershipPaymentsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('filter') filter?: AdminPaymentFilter,
  ) {
    const validFilters: AdminPaymentFilter[] = [
      'all',
      'pending',
      'validated',
      'failed',
      'cancelled',
    ];

    return this.payments.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      filter: validFilters.includes(filter as AdminPaymentFilter)
        ? (filter as AdminPaymentFilter)
        : 'all',
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const payment = await this.payments.getById(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
}
