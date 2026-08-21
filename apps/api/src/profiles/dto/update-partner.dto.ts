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
  LEGAL_MARRIAGE_AGE_FEMALE,
  PRAYER_PREFERENCE_VALUES,
  PROFILE_AGE_MAX,
} from '@easymatch/shared';

export class UpdatePartnerDto {
  @IsOptional()
  @IsInt()
  @Min(LEGAL_MARRIAGE_AGE_FEMALE)
  @Max(PROFILE_AGE_MAX)
  ageMin?: number;

  @IsOptional()
  @IsInt()
  @Min(LEGAL_MARRIAGE_AGE_FEMALE)
  @Max(PROFILE_AGE_MAX)
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
