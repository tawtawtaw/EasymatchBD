import {
  BadRequestException,
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { isStaffRole } from '@easymatch/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembershipAccountService } from './membership-account.service';

@Controller('membership')
@UseGuards(JwtAuthGuard)
export class MembershipAccountController {
  constructor(private readonly account: MembershipAccountService) {}

  @Get('account')
  getAccount(@CurrentUser() user: AuthUser) {
    if (isStaffRole(user.role)) {
      throw new BadRequestException(
        'Staff accounts do not use member subscriptions',
      );
    }
    return this.account.getAccount(user.id);
  }

  @Get('account/receipt')
  getSubscriptionReceipt(@CurrentUser() user: AuthUser) {
    if (isStaffRole(user.role)) {
      throw new BadRequestException(
        'Staff accounts do not use member subscriptions',
      );
    }
    return this.account.getSubscriptionReceipt(user.id);
  }

  @Get('payments/:paymentId/receipt')
  getReceipt(
    @CurrentUser() user: AuthUser,
    @Param('paymentId') paymentId: string,
  ) {
    if (isStaffRole(user.role)) {
      throw new BadRequestException(
        'Staff accounts do not use member subscriptions',
      );
    }
    return this.account.getPaymentReceipt(user.id, paymentId);
  }
}
