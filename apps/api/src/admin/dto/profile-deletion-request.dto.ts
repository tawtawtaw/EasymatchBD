import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProfileDeletionRequestDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ReviewProfileDeletionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
