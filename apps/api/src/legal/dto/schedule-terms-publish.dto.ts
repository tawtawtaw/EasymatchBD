import { IsDateString, IsNotEmpty } from 'class-validator';

export class ScheduleTermsPublishDto {
  @IsDateString()
  @IsNotEmpty()
  scheduledPublishAt!: string;
}
