import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CONSULTANT_SERVICE_TYPES } from '@easymatch/shared';

export class CreateConsultantCheckoutDto {
  @IsString()
  @MaxLength(64)
  connectionId!: string;

  @IsIn(CONSULTANT_SERVICE_TYPES)
  serviceType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memberNotes?: string;
}
