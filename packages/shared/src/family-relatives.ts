export const PATERNAL_RELATIVE_RELATIONS = [
  'uncle',
  'aunty',
  'paternal_grandfather',
  'paternal_grandmother',
] as const;

export const MATERNAL_RELATIVE_RELATIONS = [
  'uncle',
  'aunty',
  'maternal_grandfather',
  'maternal_grandmother',
] as const;

export type PaternalRelativeRelation =
  (typeof PATERNAL_RELATIVE_RELATIONS)[number];

export type MaternalRelativeRelation =
  (typeof MATERNAL_RELATIVE_RELATIONS)[number];
