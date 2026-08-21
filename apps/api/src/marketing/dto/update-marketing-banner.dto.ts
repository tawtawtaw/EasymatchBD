import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  MARKETING_BANNER_HREF_MAX,
  MARKETING_BANNER_LABEL_MAX,
  MARKETING_BANNER_MESSAGE_MAX,
} from '@easymatch/shared';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function emptyToNull(value: unknown) {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

export class UpdateMarketingBannerDto {
  @IsBoolean()
  enabled!: boolean;

  @IsString()
  @MaxLength(MARKETING_BANNER_MESSAGE_MAX)
  messageEn!: string;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(MARKETING_BANNER_MESSAGE_MAX)
  messageBn?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(MARKETING_BANNER_LABEL_MAX)
  labelEn?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(MARKETING_BANNER_LABEL_MAX)
  labelBn?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(MARKETING_BANNER_HREF_MAX)
  href?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @Matches(ISO_DATE)
  startsAt?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, value) => value != null)
  @IsString()
  @Matches(ISO_DATE)
  endsAt?: string | null;
}
