export type DropdownOption = {
  value: string;
  label: string;
  parentValue?: string | null;
};

export type DropdownMap = Record<string, DropdownOption[]>;
