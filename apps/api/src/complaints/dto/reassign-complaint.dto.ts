import { IsOptional, IsString } from 'class-validator';

export class ReassignComplaintDto {
  @IsOptional()
  @IsString()
  consultantId?: string | null;
}
