import { IsISO8601 } from 'class-validator';

export class RescheduleVideoCallDto {
  @IsISO8601()
  scheduledAt!: string;
}
