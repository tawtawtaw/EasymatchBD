import { IsISO8601, IsOptional } from 'class-validator';

export class CreateVideoCallDto {
  /** Omit or null for an immediate call; ISO datetime to schedule for later. */
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string | null;
}
