import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class StaffLoginDto {
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
