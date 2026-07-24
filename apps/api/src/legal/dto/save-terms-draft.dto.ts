import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { TermsSection } from '@easymatch/shared';

export class SaveTermsDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  version!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  effectiveDateEn!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  effectiveDateBn!: string;

  @IsArray()
  sectionsEn!: TermsSection[];

  @IsArray()
  sectionsBn!: TermsSection[];
}

export class PublishTermsDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string;
}
