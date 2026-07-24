import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateComplaintDiaryEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class UpdateComplaintDiaryEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}
