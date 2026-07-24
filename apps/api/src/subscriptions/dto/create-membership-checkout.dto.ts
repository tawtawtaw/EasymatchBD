import { PAID_MEMBERSHIP_TARIFF_PLANS } from '@easymatch/shared';
import { IsIn } from 'class-validator';

export class CreateMembershipCheckoutDto {
  @IsIn(PAID_MEMBERSHIP_TARIFF_PLANS)
  plan!: string;
}
