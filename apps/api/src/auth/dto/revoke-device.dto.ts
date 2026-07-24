import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RevokeDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceToken!: string;
}
