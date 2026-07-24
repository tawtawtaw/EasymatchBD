import { IsOptional, IsString } from 'class-validator';

export class ConfirmMembershipPaymentDto {
  @IsOptional()
  @IsString()
  tranId?: string;

  @IsOptional()
  @IsString()
  valId?: string;
}
