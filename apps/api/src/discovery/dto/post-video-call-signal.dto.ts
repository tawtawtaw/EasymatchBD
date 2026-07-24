import { IsIn, IsObject } from 'class-validator';

export class PostVideoCallSignalDto {
  @IsIn(['offer', 'answer', 'ice'])
  type!: 'offer' | 'answer' | 'ice';

  @IsObject()
  payload!: Record<string, unknown>;
}
