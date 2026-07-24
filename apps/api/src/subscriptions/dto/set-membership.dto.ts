import { IsIn } from 'class-validator';

export class SetMembershipDto {
  @IsIn(['free', 'gold', 'platinum'])
  plan!: 'free' | 'gold' | 'platinum';
}
