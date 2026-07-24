import {
  BadRequestException,
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { isPaidMember, isStaffRole } from '@easymatch/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfirmMembershipPaymentDto } from './dto/confirm-membership-payment.dto';
import { MembershipPaymentService } from './membership-payment.service';

@Controller('membership/payments')
@UseGuards(JwtAuthGuard)
export class MembershipPaymentsController {
  constructor(private readonly payments: MembershipPaymentService) {}

  @Post('confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmMembershipPaymentDto,
  ) {
    if (isStaffRole(user.role)) {
      throw new BadRequestException(
        'Staff accounts do not use member subscriptions',
      );
    }

    return this.payments.confirmMembershipForUser(user.id, {
      tranId: dto.tranId?.trim(),
      valId: dto.valId?.trim(),
    });
  }
}
