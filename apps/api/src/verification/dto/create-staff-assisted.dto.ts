import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStaffAssistedDto {
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  consentNote!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  consentChannel?: string;
}
