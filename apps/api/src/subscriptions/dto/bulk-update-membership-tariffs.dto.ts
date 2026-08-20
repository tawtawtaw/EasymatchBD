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
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PAID_MEMBERSHIP_TARIFF_PLANS } from '@easymatch/shared';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateMembershipTariffItemDto {
  @IsIn(PAID_MEMBERSHIP_TARIFF_PLANS)
  plan!: string;

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

  @IsInt()
  @Min(1)
  durationDays!: number;

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

  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountPriceBdt?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @Matches(ISO_DATE)
  discountStartsAt?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @Matches(ISO_DATE)
  discountEndsAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  discountLabelEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  discountLabelBn?: string | null;
}

export class BulkUpdateMembershipTariffsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateMembershipTariffItemDto)
  tariffs!: UpdateMembershipTariffItemDto[];
}
