import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDropdownOptionDto {
  @IsString()
  @MaxLength(50)
  category!: string;

  @IsString()
  @MaxLength(80)
  value!: string;

  @IsString()
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  labelBn?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
