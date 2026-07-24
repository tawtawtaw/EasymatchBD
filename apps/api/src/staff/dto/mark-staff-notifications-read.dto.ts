import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class MarkStaffNotificationsReadDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}
