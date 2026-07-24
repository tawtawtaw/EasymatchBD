import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class PrivacyFieldUpdateItemDto {
  @IsString()
  fieldKey!: string;

  @IsBoolean()
  isShareable!: boolean;

  @IsInt()
  @Min(0)
  @Max(3)
  minPrivacyLevel!: number;
}

export class BulkUpdatePrivacyFieldsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrivacyFieldUpdateItemDto)
  fields!: PrivacyFieldUpdateItemDto[];
}
