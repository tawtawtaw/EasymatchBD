import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  DOWRY_EXPECTATION_VALUES,
  EXPECTED_KABIN_AMOUNT_BDT_MAX,
  EXPECTED_KABIN_AMOUNT_BDT_MIN,
  EXPECTED_MARRIAGE_TIMELINE_VALUES,
  EXPECTED_PARENTHOOD_TIMELINE_VALUES,
  LIVING_ARRANGEMENTS_FEMALE_VALUES,
  LIVING_ARRANGEMENTS_MALE_VALUES,
  WEDDING_CEREMONY_PREFERENCE_VALUES,
} from '@easymatch/shared';

const LIVING_ARRANGEMENTS_VALUES = [
  ...LIVING_ARRANGEMENTS_MALE_VALUES,
  ...LIVING_ARRANGEMENTS_FEMALE_VALUES,
] as const;

export class UpdateMaritalDto {
  @IsOptional()
  @IsString()
  @IsIn(EXPECTED_MARRIAGE_TIMELINE_VALUES)
  expectedMarriageTimeline?: string;

  @IsOptional()
  @IsString()
  @IsIn(DOWRY_EXPECTATION_VALUES)
  dowryExpectation?: string;

  @IsOptional()
  @IsString()
  @IsIn(WEDDING_CEREMONY_PREFERENCE_VALUES)
  weddingCeremonyPreference?: string;

  @IsOptional()
  @IsString()
  @IsIn(EXPECTED_PARENTHOOD_TIMELINE_VALUES)
  expectedParenthoodTimeline?: string;

  @IsOptional()
  @IsString()
  @IsIn(LIVING_ARRANGEMENTS_VALUES)
  livingArrangements?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  livingArrangementsOther?: string;

  @IsOptional()
  @IsInt()
  @Min(EXPECTED_KABIN_AMOUNT_BDT_MIN)
  @Max(EXPECTED_KABIN_AMOUNT_BDT_MAX)
  expectedKabinAmountMinBdt?: number;

  @IsOptional()
  @IsInt()
  @Min(EXPECTED_KABIN_AMOUNT_BDT_MIN)
  @Max(EXPECTED_KABIN_AMOUNT_BDT_MAX)
  expectedKabinAmountMaxBdt?: number;
}
