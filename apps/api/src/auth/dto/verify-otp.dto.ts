import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { AUTH_OTP_PURPOSES, type AuthOtpPurpose } from './send-otp.dto';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @IsOptional()
  @IsIn(AUTH_OTP_PURPOSES)
  purpose?: AuthOtpPurpose;

  /** When true (default), issue a trusted-device token for OTP-free return visits. */
  @IsOptional()
  @IsBoolean()
  rememberDevice?: boolean;
}
