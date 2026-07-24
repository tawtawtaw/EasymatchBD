import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  displayDateToIso,
  isValidDisplayDate,
} from '@easymatch/shared';
import { HAS_BEARD_VALUES, HIJAB_PRACTICE_VALUES, PRAYER_PRACTICE_VALUES, SMOKING_HABIT_VALUES } from '@easymatch/shared';

export class UpdatePersonalDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value == null) return undefined;
    if (typeof value === 'string' && isValidDisplayDate(value)) {
      return displayDateToIso(value.trim());
    }
    return value;
  })
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  divorceDetails?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value == null) return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : value;
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  childrenCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  heightUnit?: 'cm' | 'ft_in';

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(8)
  heightFeet?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  heightInches?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(200)
  weightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  complexion?: string;

  @IsOptional()
  @IsBoolean()
  hasDisability?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  disabilityInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  religion?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([...HAS_BEARD_VALUES])
  hasBeard?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([...PRAYER_PRACTICE_VALUES])
  prayerPractice?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([...HIJAB_PRACTICE_VALUES])
  hijabPractice?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([...SMOKING_HABIT_VALUES])
  smokingHabit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  educationMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  highestDegree?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalEducationQualifications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  institution?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  educationYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  educationSubject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  monthlyIncomeRange?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  currentCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  currentDivision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  currentDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  currentUpazila?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  currentCityTown?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  currentAddressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  permanentCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  permanentDivision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  permanentDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  permanentUpazila?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  permanentCityTown?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  permanentAddressLine?: string;

  @IsOptional()
  @IsBoolean()
  permanentSameAsCurrent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  biography?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hobbies?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  interests?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  introduction?: string;
}
