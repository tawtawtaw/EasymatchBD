import QRCode from "qrcode";

export async function toQrDataUrl(value: string): Promise<string | null> {
  if (!value) return null;
  try {
    return await QRCode.toDataURL(value, {
      margin: 1,
      width: 220,
      color: { dark: "#4c0519", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}
