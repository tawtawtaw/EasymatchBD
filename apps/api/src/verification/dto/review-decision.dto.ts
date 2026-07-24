import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ReviewDecisionDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @ValidateIf((dto: ReviewDecisionDto) => dto.decision === 'rejected')
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  officerMessage?: string;
}
