import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const AUTH_OTP_PURPOSES = ['member', 'staff'] as const;
export type AuthOtpPurpose = (typeof AUTH_OTP_PURPOSES)[number];

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsIn(AUTH_OTP_PURPOSES)
  purpose?: AuthOtpPurpose;
}
