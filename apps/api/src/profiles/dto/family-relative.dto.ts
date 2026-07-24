import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  MATERNAL_RELATIVE_RELATIONS,
  PATERNAL_RELATIVE_RELATIONS,
} from '@easymatch/shared';

export class PaternalRelativeDto {
  @IsOptional()
  @IsString()
  @IsIn([...PATERNAL_RELATIVE_RELATIONS])
  relation?: string;

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
}

export class MaternalRelativeDto {
  @IsOptional()
  @IsString()
  @IsIn([...MATERNAL_RELATIVE_RELATIONS])
  relation?: string;

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
}
