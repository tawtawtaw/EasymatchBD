import {
  BadRequestException,
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { isStaffRole } from '@easymatch/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMembershipCheckoutDto } from './dto/create-membership-checkout.dto';
import { MembershipPaymentService } from './membership-payment.service';

@Controller('membership/checkout')
@UseGuards(JwtAuthGuard)
export class MembershipCheckoutController {
  constructor(private readonly payments: MembershipPaymentService) {}

  @Post()
  checkout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMembershipCheckoutDto,
  ) {
    if (isStaffRole(user.role)) {
      throw new BadRequestException(
        'Staff accounts do not use member subscriptions',
      );
    }

    return this.payments.createCheckout(user.id, dto.plan);
  }
}
