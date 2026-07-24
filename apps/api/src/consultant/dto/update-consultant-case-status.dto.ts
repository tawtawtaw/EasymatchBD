import { IsIn } from 'class-validator';
import { ConsultantEngagementStatus } from '@prisma/client';

const ALLOWED = [
  ConsultantEngagementStatus.in_progress,
  ConsultantEngagementStatus.completed,
  ConsultantEngagementStatus.cancelled,
] as const;

export class UpdateConsultantCaseStatusDto {
  @IsIn(ALLOWED)
  status!: (typeof ALLOWED)[number];
}
