export const PROFILE_CREATION_MODES = ['self', 'on_behalf'] as const;
export type ProfileCreationMode = (typeof PROFILE_CREATION_MODES)[number];

export const ON_BEHALF_RELATIONS = [
  'my_son',
  'my_daughter',
  'my_relative',
  'someone_else',
] as const;
export type OnBehalfRelation = (typeof ON_BEHALF_RELATIONS)[number];

export const NID_DOCUMENT_SUBJECTS = ['member', 'creator'] as const;
export type NidDocumentSubject = (typeof NID_DOCUMENT_SUBJECTS)[number];

export function isOnBehalfProfile(profile: {
  creationMode?: ProfileCreationMode | string | null;
}): boolean {
  return profile.creationMode === 'on_behalf';
}
