import { IsIn, IsOptional } from 'class-validator';
import {
  ON_BEHALF_RELATIONS,
  PROFILE_CREATION_MODES,
  type OnBehalfRelation,
  type ProfileCreationMode,
} from '@easymatch/shared';

export class SetCreationIntentDto {
  @IsIn([...PROFILE_CREATION_MODES])
  creationMode!: ProfileCreationMode;

  @IsOptional()
  @IsIn([...ON_BEHALF_RELATIONS])
  onBehalfRelation?: OnBehalfRelation;
}
