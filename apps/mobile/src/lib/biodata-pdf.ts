import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buildBiodataPdfHtml } from "./biodata-pdf-html";
import { fetchAuthenticatedImageDataUri } from "./authenticated-image-data-uri";
import type { AppLocale } from "./locale";
import type { BiodataExportPayload } from "../types/biodata-export";
import type { DropdownMap } from "../types/dropdowns";
import type { tBiodataExport, tPrivacyLevel } from "../i18n/messages";
import { profilePhotoUrl } from "../services/media";

type Copy = ReturnType<typeof tBiodataExport>;

export async function exportAndShareBiodataPdf(options: {
  data: BiodataExportPayload;
  dropdowns: DropdownMap;
  locale: AppLocale;
  copy: Copy;
  privacyLabels: ReturnType<typeof tPrivacyLevel>;
}) {
  const { data, dropdowns, locale, copy, privacyLabels } = options;

  let primaryPhotoDataUri: string | null = null;
  if (data.media.primaryPhotoId) {
    primaryPhotoDataUri = await fetchAuthenticatedImageDataUri(
      profilePhotoUrl(data.media.primaryPhotoId),
    );
  }

  const privacyLabel =
    privacyLabels[String(data.privacyLevel) as keyof ReturnType<typeof tPrivacyLevel>] ??
    String(data.privacyLevel);

  const html = buildBiodataPdfHtml({
    data,
    dropdowns,
    locale,
    copy,
    privacyLabel,
    primaryPhotoDataUri,
  });

  const { uri } = await Print.printToFileAsync({ html });
  const filename = `easymatch-biodata-${data.profileCode}-L${data.privacyLevel}.pdf`;

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: filename,
    });
  } else {
    throw new Error(copy.shareUnavailable);
  }
}
