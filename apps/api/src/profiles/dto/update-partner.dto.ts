import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  BEARD_PREFERENCE_VALUES,
  HIJAB_PREFERENCE_VALUES,
  PRAYER_PREFERENCE_VALUES,
} from '@easymatch/shared';

export class UpdatePartnerDto {
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(80)
  ageMin?: number;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(80)
  ageMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  heightUnit?: 'cm' | 'ft_in';

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  heightMinCm?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  heightMaxCm?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(8)
  heightMinFeet?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  heightMinInches?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(8)
  heightMaxFeet?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  heightMaxInches?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(200)
  weightMinKg?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(200)
  weightMaxKg?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDistricts?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  minimumEducation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredProfession?: string[];

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([...BEARD_PREFERENCE_VALUES])
  beardPreference?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([...PRAYER_PREFERENCE_VALUES])
  prayerPreference?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([...HIJAB_PREFERENCE_VALUES])
  hijabPreference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  maritalStatusPref?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string;
}
