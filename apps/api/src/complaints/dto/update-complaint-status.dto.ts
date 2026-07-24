import { MemberComplaintStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateComplaintStatusDto {
  @IsEnum(MemberComplaintStatus)
  status!: MemberComplaintStatus;
}
