const BD_MOBILE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;

export function isValidBangladeshPhone(phone: string): boolean {
  const normalized = phone.replace(/[\s-]/g, "");
  return BD_MOBILE_REGEX.test(normalized);
}
