import type { DropdownSeedOption } from './dropdown-data';
export type DistrictSeedOption = DropdownSeedOption & {
    parentValue: string;
};
export declare const DISTRICT_SEED: DistrictSeedOption[];
