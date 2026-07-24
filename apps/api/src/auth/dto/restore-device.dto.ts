import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AUTH_OTP_PURPOSES, type AuthOtpPurpose } from './send-otp.dto';

export class RestoreDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceToken!: string;

  @IsOptional()
  @IsIn(AUTH_OTP_PURPOSES)
  purpose?: AuthOtpPurpose;
}
