import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmConsultantPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tranId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  valId?: string;
}
