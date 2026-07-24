export const IS_ALIVE_VALUES = ['yes', 'no', 'prefer_not_to_say'] as const;
export type IsAliveValue = (typeof IS_ALIVE_VALUES)[number];
