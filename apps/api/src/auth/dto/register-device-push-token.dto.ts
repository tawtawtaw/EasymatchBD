import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDevicePushTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceToken!: string;

  @IsString()
  @MinLength(8)
  token!: string;

  @IsOptional()
  @IsString()
  platform?: string;
}
