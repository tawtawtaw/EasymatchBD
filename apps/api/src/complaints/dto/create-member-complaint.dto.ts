import { MemberComplaintCategory } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMemberComplaintDto {
  @IsString()
  @MinLength(8)
  @MaxLength(8)
  profileCode!: string;

  @IsEnum(MemberComplaintCategory)
  category!: MemberComplaintCategory;

  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  description!: string;
}
