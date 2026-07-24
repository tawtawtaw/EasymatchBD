const BD_MOBILE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;

export function isValidBangladeshPhone(phone: string): boolean {
  const normalized = phone.replace(/[\s-]/g, '');
  return BD_MOBILE_REGEX.test(normalized);
}

/** Normalize to E.164 format: +8801XXXXXXXXX */
export function normalizeBangladeshPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('880') && digits.length === 13) {
    return `+${digits}`;
  }

  if (digits.startsWith('01') && digits.length === 11) {
    return `+88${digits}`;
  }

  if (digits.startsWith('1') && digits.length === 10) {
    return `+880${digits}`;
  }

  throw new Error('Invalid Bangladesh mobile number');
}
