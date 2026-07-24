import { MemberComplaintStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveComplaintDto {
  @IsEnum(MemberComplaintStatus)
  status!: MemberComplaintStatus;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  resolutionNote?: string;
}
