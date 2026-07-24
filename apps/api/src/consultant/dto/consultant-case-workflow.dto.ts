import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendConsultantCaseMessageDto {
  @IsString()
  @MaxLength(4000)
  body!: string;

  /** When set by consultant, message is visible only to that member (plus consultant). Omit for both members. */
  @IsOptional()
  @IsString()
  recipientId?: string;
}

export class CreateConsultantDiaryEntryDto {
  @IsString()
  @MaxLength(10000)
  body!: string;
}

export class UpdateConsultantDiaryEntryDto {
  @IsString()
  @MaxLength(10000)
  body!: string;
}

export class ScheduleConsultantMeetingDto {
  @IsISO8601()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  agenda?: string;

  @IsOptional()
  @IsBoolean()
  includeVideoCall?: boolean;
}
