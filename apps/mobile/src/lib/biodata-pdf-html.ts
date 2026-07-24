import {
  BIODATA_SKIP_KEYS,
  KNOWN_PARTNER_FIELD_KEYS,
  KNOWN_PRIVACY_FIELD_KEYS,
  KNOWN_RELATIVE_FIELD_KEYS,
  KNOWN_SIBLING_FIELD_KEYS,
  createFieldOptionResolver,
  formatBiodataFieldValue,
  humanizeFieldKey,
  resolvePrivacyLabelKey,
} from "./biodata-display";
import {
  biodataCommonLabel,
  partnerFieldLabel,
  privacyFieldLabel,
  profileFieldLabel,
} from "../i18n/biodata-fields";
import type { AppLocale } from "./locale";
import type { BiodataExportPayload } from "../types/biodata-export";
import type { DropdownMap } from "../types/dropdowns";
import type { tBiodataExport } from "../i18n/messages";

type BiodataSectionKind =
  | "personal"
  | "family"
  | "marital"
  | "partner"
  | "siblings"
  | "paternal_relatives"
  | "maternal_relatives";

type Copy = ReturnType<typeof tBiodataExport>;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelForKey(
  locale: AppLocale,
  key: string,
  kind: BiodataSectionKind,
): string {
  if (kind === "partner") {
    if (KNOWN_PARTNER_FIELD_KEYS.has(key)) {
      return partnerFieldLabel(locale, key);
    }
    return humanizeFieldKey(key);
  }

  if (kind === "siblings") {
    if (KNOWN_SIBLING_FIELD_KEYS.has(key)) {
      return profileFieldLabel(locale, key);
    }
    return humanizeFieldKey(key);
  }

  if (kind === "paternal_relatives" || kind === "maternal_relatives") {
    if (KNOWN_RELATIVE_FIELD_KEYS.has(key)) {
      return profileFieldLabel(locale, key);
    }
    return humanizeFieldKey(key);
  }

  const labelKey = resolvePrivacyLabelKey(key);
  if ((KNOWN_PRIVACY_FIELD_KEYS as ReadonlySet<string>).has(labelKey)) {
    return privacyFieldLabel(locale, labelKey);
  }
  return humanizeFieldKey(labelKey);
}

function buildRows(
  entries: [string, unknown][],
  kind: BiodataSectionKind,
  locale: AppLocale,
  dropdowns: DropdownMap,
  personal?: Record<string, unknown>,
) {
  const resolveStaticOption = createFieldOptionResolver((relativeKey) =>
    profileFieldLabel(locale, relativeKey),
  );

  const relativeRelationGroup =
    kind === "paternal_relatives"
      ? "paternalRelativeRelationOptions"
      : kind === "maternal_relatives"
        ? "maternalRelativeRelationOptions"
        : undefined;

  const formatValue = (key: string, value: unknown) =>
    formatBiodataFieldValue(key, value, {
      locale,
      dropdowns,
      personal,
      resolveStaticOption,
      yesLabel: biodataCommonLabel(locale, "yes"),
      noLabel: biodataCommonLabel(locale, "no"),
      relativeRelationGroup,
      translateField: (fieldKey) => profileFieldLabel(locale, fieldKey),
      allDistrictsLabel: profileFieldLabel(locale, "allDistrictsOfBangladesh"),
      anyReligionLabel: profileFieldLabel(locale, "anyReligion"),
    });

  return entries
    .filter(
      ([key, value]) =>
        !BIODATA_SKIP_KEYS.has(key) &&
        value !== null &&
        value !== undefined &&
        value !== "",
    )
    .map(([key, value]) => ({
      label: labelForKey(locale, key, kind),
      value: formatValue(key, value),
    }));
}

function rowsHtml(rows: { label: string; value: string }[]) {
  if (rows.length === 0) return "";
  return rows
    .map(
      (row) => `
        <tr>
          <td class="label">${escapeHtml(row.label)}</td>
          <td class="value">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join("");
}

function sectionHtml(title: string, body: string) {
  if (!body.trim()) return "";
  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <table>${body}</table>
    </section>`;
}

function objectSection(
  title: string,
  kind: BiodataSectionKind,
  data: Record<string, unknown> | null,
  locale: AppLocale,
  dropdowns: DropdownMap,
  personal?: Record<string, unknown>,
) {
  if (!data) return "";
  const rows = buildRows(Object.entries(data), kind, locale, dropdowns, personal);
  return sectionHtml(title, rowsHtml(rows));
}

function listSection(
  title: string,
  kind: BiodataSectionKind,
  data: Record<string, unknown>[] | null,
  locale: AppLocale,
  dropdowns: DropdownMap,
  personal?: Record<string, unknown>,
  entryLabel?: (index: number) => string,
) {
  if (!data?.length) return "";

  const blocks = data
    .map((entry, index) => {
      const rows = buildRows(Object.entries(entry), kind, locale, dropdowns, personal);
      if (rows.length === 0) return "";
      const heading = entryLabel ? entryLabel(index) : `#${index + 1}`;
      return `
        <div class="entry">
          <h3>${escapeHtml(heading)}</h3>
          <table>${rowsHtml(rows)}</table>
        </div>`;
    })
    .filter(Boolean)
    .join("");

  if (!blocks) return "";
  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      ${blocks}
    </section>`;
}

function verificationBadge(data: BiodataExportPayload, copy: Copy) {
  if (data.media.verifiedOnBehalf && data.media.memberNidVerified) {
    return copy.verifiedOnBehalfDualNidYes;
  }
  if (data.media.verifiedOnBehalf) {
    return copy.verifiedOnBehalfYes;
  }
  if (data.media.isVerified) {
    return copy.verifiedYes;
  }
  return null;
}

export function buildBiodataPdfHtml(options: {
  data: BiodataExportPayload;
  dropdowns: DropdownMap;
  locale: AppLocale;
  copy: Copy;
  privacyLabel: string;
  primaryPhotoDataUri?: string | null;
}) {
  const { data, dropdowns, locale, copy, privacyLabel, primaryPhotoDataUri } = options;
  const generatedDate = new Date(data.generatedAt).toLocaleString(
    locale === "bn" ? "bn-BD" : "en-GB",
    { dateStyle: "medium", timeStyle: "short" },
  );
  const badge = verificationBadge(data, copy);

  const contactRows = [
    data.media.phone
      ? { label: copy.contactPhone, value: String(data.media.phone) }
      : null,
    badge ? { label: copy.contactVerification, value: badge } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const sections = [
    objectSection(
      copy.sections.personal,
      "personal",
      data.personal,
      locale,
      dropdowns,
      data.personal,
    ),
    objectSection(copy.sections.family, "family", data.family, locale, dropdowns, data.personal),
    objectSection(copy.sections.marital, "marital", data.marital, locale, dropdowns, data.personal),
    listSection(
      copy.sections.siblings,
      "siblings",
      data.siblings,
      locale,
      dropdowns,
      data.personal,
      (index) => copy.siblingNumber.replace("{number}", String(index + 1)),
    ),
    listSection(
      copy.sections.paternalRelatives,
      "paternal_relatives",
      data.paternalRelatives,
      locale,
      dropdowns,
      data.personal,
      (index) => copy.relativeNumber.replace("{number}", String(index + 1)),
    ),
    listSection(
      copy.sections.maternalRelatives,
      "maternal_relatives",
      data.maternalRelatives,
      locale,
      dropdowns,
      data.personal,
      (index) => copy.relativeNumber.replace("{number}", String(index + 1)),
    ),
    objectSection(copy.sections.partner, "partner", data.partner, locale, dropdowns, data.personal),
    contactRows.length
      ? sectionHtml(copy.sections.contact, rowsHtml(contactRows))
      : "",
  ].join("");

  const photoBlock = primaryPhotoDataUri
    ? `
      <section class="section photo-section">
        <h2>${escapeHtml(copy.sections.photo)}</h2>
        <img src="${primaryPhotoDataUri}" alt="${escapeHtml(copy.primaryPhotoAlt)}" class="photo" />
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        color: #18181b;
        margin: 0;
        padding: 24px;
        background: #ffffff;
      }
      .header {
        background: #9f1239;
        color: #ffffff;
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 20px;
      }
      .brand {
        font-size: 11px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #ffe4e6;
      }
      .title {
        margin: 8px 0 0;
        font-size: 24px;
        font-weight: 700;
      }
      .meta {
        margin-top: 12px;
        font-size: 13px;
        color: #fff1f2;
        line-height: 1.6;
      }
      .badge {
        display: inline-block;
        margin-top: 12px;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.15);
        font-size: 12px;
        font-weight: 600;
      }
      .section {
        margin-bottom: 18px;
        border: 1px solid #e4e4e7;
        border-radius: 12px;
        overflow: hidden;
        page-break-inside: avoid;
      }
      .section h2 {
        margin: 0;
        padding: 10px 14px;
        background: #fff1f2;
        color: #881337;
        font-size: 14px;
      }
      .section h3 {
        margin: 0;
        padding: 8px 14px 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #71717a;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td {
        padding: 8px 14px;
        border-top: 1px solid #f4f4f5;
        vertical-align: top;
        font-size: 12px;
      }
      .label {
        width: 42%;
        color: #71717a;
      }
      .value {
        font-weight: 600;
        color: #18181b;
      }
      .photo-section {
        text-align: center;
      }
      .photo {
        width: 160px;
        height: 200px;
        object-fit: cover;
        border-radius: 8px;
        margin: 12px auto 16px;
        display: block;
      }
      .footer {
        margin-top: 24px;
        font-size: 10px;
        color: #71717a;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <header class="header">
      <div class="brand">${escapeHtml(copy.brand)}</div>
      <h1 class="title">${escapeHtml(copy.documentTitle)}</h1>
      <div class="meta">
        <div>${escapeHtml(copy.profileId.replace("{code}", data.profileCode))}</div>
        <div>${escapeHtml(copy.privacyLevel.replace("{level}", String(data.privacyLevel)).replace("{label}", privacyLabel))}</div>
        <div>${escapeHtml(copy.generatedAt.replace("{date}", generatedDate))}</div>
      </div>
      ${badge ? `<div class="badge">${escapeHtml(badge)}</div>` : ""}
    </header>
    ${photoBlock}
    ${sections || `<p>${escapeHtml(copy.emptyAtLevel)}</p>`}
    <footer class="footer">${escapeHtml(copy.footer)}</footer>
  </body>
</html>`;
}
