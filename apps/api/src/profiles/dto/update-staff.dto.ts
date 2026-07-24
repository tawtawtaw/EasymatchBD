import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  employeeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  officeDivision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  officeDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  officeAddressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
