import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { WhatsAppSupportPanel } from "@/components/WhatsAppSupportPanel";
import {
  buildWhatsAppChatUrl,
  normalizeWhatsAppPhoneDigits,
  resolveWhatsAppSupportNumber,
} from "@/lib/whatsapp-support";

export const WHATSAPP_SUPPORT_FAB_ID = "easymatch-whatsapp-fab";

export async function WhatsAppSupport() {
  await connection();
  const phoneDigits = normalizeWhatsAppPhoneDigits(
    resolveWhatsAppSupportNumber(),
  );
  if (!phoneDigits) return null;

  const t = await getTranslations("whatsappSupport");
  const defaultHref = buildWhatsAppChatUrl(
    phoneDigits,
    t("topics.general.message"),
  );

  return (
    <>
      <a
        id={WHATSAPP_SUPPORT_FAB_ID}
        href={defaultHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("open")}
        className="easymatch-whatsapp-fab"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>
      <WhatsAppSupportPanel
        phoneDigits={phoneDigits}
        fabId={WHATSAPP_SUPPORT_FAB_ID}
      />
    </>
  );
}
