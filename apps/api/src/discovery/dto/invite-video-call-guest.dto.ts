import { IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteVideoCallGuestDto {
  @IsString()
  @MaxLength(80)
  guestName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  relation?: string;
}
