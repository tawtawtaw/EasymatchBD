export const BANGLADESH_COUNTRY = 'Bangladesh';

export const ADDRESS_COUNTRY_OPTIONS = [
  BANGLADESH_COUNTRY,
  'Australia',
  'Canada',
  'France',
  'Germany',
  'India',
  'Italy',
  'Kuwait',
  'Malaysia',
  'Oman',
  'Pakistan',
  'Qatar',
  'Saudi Arabia',
  'Singapore',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
] as const;

export function normalizeCountry(country: string | null | undefined): string {
  const trimmed = country?.trim() ?? '';
  if (!trimmed || /^bangladesh$/i.test(trimmed)) {
    return BANGLADESH_COUNTRY;
  }
  return trimmed;
}

export function isBangladeshAddress(country: string | null | undefined): boolean {
  return normalizeCountry(country) === BANGLADESH_COUNTRY;
}

export type MemberAddressValues = {
  country: string;
  division: string;
  district: string;
  upazila: string;
  cityTown: string;
  addressLine: string;
};

export function clearBangladeshAddressFields<T extends MemberAddressValues>(
  address: T,
): T {
  return {
    ...address,
    division: '',
    district: '',
    upazila: '',
  };
}

export function clearInternationalAddressFields<T extends MemberAddressValues>(
  address: T,
): T {
  return {
    ...address,
    division: '',
    district: '',
    upazila: '',
    cityTown: '',
    addressLine: '',
  };
}
