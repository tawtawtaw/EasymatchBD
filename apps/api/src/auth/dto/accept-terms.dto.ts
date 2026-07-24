import { IsString } from 'class-validator';

export class AcceptTermsDto {
  @IsString()
  version!: string;
}
