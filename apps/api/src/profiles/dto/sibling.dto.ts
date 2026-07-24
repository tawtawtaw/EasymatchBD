import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SiblingDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relationship?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  education?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  profession?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  spouseName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  spouseEducation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  spouseProfession?: string;
}
