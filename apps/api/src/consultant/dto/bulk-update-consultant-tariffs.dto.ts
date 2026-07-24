import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CONSULTANT_SERVICE_TYPES } from '@easymatch/shared';

export class UpdateConsultantTariffItemDto {
  @IsIn(CONSULTANT_SERVICE_TYPES)
  serviceType!: string;

  @IsString()
  @MaxLength(120)
  labelEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  labelBn?: string | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceBdt!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsBoolean()
  isActive!: boolean;

  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionBn?: string | null;
}

export class BulkUpdateConsultantTariffsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateConsultantTariffItemDto)
  tariffs!: UpdateConsultantTariffItemDto[];
}
