import { IsIn, IsOptional } from 'class-validator';
import {
  MEMBER_PROFILE_CREATION_MODES,
  ON_BEHALF_RELATIONS,
  type MemberProfileCreationMode,
  type OnBehalfRelation,
} from '@easymatch/shared';

export class SetCreationIntentDto {
  @IsIn([...MEMBER_PROFILE_CREATION_MODES])
  creationMode!: MemberProfileCreationMode;

  @IsOptional()
  @IsIn([...ON_BEHALF_RELATIONS])
  onBehalfRelation?: OnBehalfRelation;
}
