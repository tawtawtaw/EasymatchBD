import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IS_ALIVE_VALUES } from '@easymatch/shared';
import { SiblingDto } from './sibling.dto';
import {
  MaternalRelativeDto,
  PaternalRelativeDto,
} from './family-relative.dto';

export class UpdateFamilyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fatherName?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([...IS_ALIVE_VALUES])
  fatherIsAlive?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fatherEducation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fatherProfession?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  motherName?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([...IS_ALIVE_VALUES])
  motherIsAlive?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  motherEducation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  motherProfession?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  familyType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  familyStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  familyValues?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  familyAssets?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiblingDto)
  siblings?: SiblingDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaternalRelativeDto)
  paternalRelatives?: PaternalRelativeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaternalRelativeDto)
  maternalRelatives?: MaternalRelativeDto[];
}
