/** Factual company details shown on the About page (locale-independent values). */
export const ABOUT_COMPANY = {
  businessName: "EasyMatch BD",
  founder: "Md. Khaled Morshed",
  businessTypeKey: "marriageMedia" as const,
  tradeLicenceNo: "TRAD/DNCC/000304/2026",
  licensingAuthorityKey: "dncc" as const,
  tinPlaceholderKey: "pending" as const,
  dbidPlaceholderKey: "pending" as const,
  officeAddressKey: "office" as const,
  website: "https://easymatchbd.com",
  email: "easymatch.bd@gmail.com",
  businessMobile: "01730321717",
  customerSupport: "01558416067",
  facebook: "https://www.facebook.com/EasyMatchBD",
  youtube: "https://www.youtube.com/@EasyMatchBD-Matrimoni",
} as const;

export function phoneTelHref(localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "");
  if (digits.startsWith("880")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+88${digits}`;
  return `tel:+880${digits}`;
}
