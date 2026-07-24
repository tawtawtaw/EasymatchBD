import { Alert } from "react-native";
import { tWhatsappSupport } from "../i18n/whatsapp-support";
import type { AppLocale } from "../lib/locale";
import { openExternalAppUrl } from "../lib/webview-external-url";
import {
  buildWhatsAppChatUrl,
  getWhatsAppSupportPhoneDigits,
  isWhatsAppSupportEnabled,
  type WhatsAppSupportTopic,
} from "../lib/whatsapp-support";

export async function openWhatsAppSupportChat(
  locale: AppLocale,
  topic: WhatsAppSupportTopic = "general",
): Promise<boolean> {
  const phoneDigits = getWhatsAppSupportPhoneDigits();
  if (!phoneDigits) return false;

  const copy = tWhatsappSupport(locale);
  const message = copy.topics[topic].message;
  const url = buildWhatsAppChatUrl(phoneDigits, message);
  const opened = await openExternalAppUrl(url);
  if (!opened) {
    Alert.alert(copy.panelTitle, copy.openError);
  }
  return opened;
}

export { isWhatsAppSupportEnabled };
