"use client";

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AuthenticatedBlobImage } from "@/components/AuthenticatedBlobImage";
import type { DropdownMap } from "@/lib/api";
import {
  BIODATA_SKIP_KEYS,
  createFieldOptionResolver,
  formatBiodataFieldValue,
  humanizeFieldKey,
  KNOWN_PARTNER_FIELD_KEYS,
  KNOWN_PRIVACY_FIELD_KEYS,
  KNOWN_RELATIVE_FIELD_KEYS,
  KNOWN_SIBLING_FIELD_KEYS,
  resolvePrivacyLabelKey,
} from "@/lib/biodata-display";
import type { BiodataExportPayload } from "@/lib/profile-biodata-export";
import { photoFileUrl } from "@/lib/media";
import {
  BiodataFieldRows,
  biodataThemeForSection,
  type BiodataSectionTheme,
} from "@/components/BiodataFieldRows";
import { BIODATA_PDF_CSS } from "@/lib/pdf-document-styles";

type BiodataPdfDocumentProps = {
  data: BiodataExportPayload;
  token: string;
  dropdowns: DropdownMap;
  photoPath?: (photoId: string) => string;
  fetchBlob?: (token: string, path: string) => Promise<Blob>;
};

const SKIP_VALUE_KEYS = BIODATA_SKIP_KEYS;

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: BiodataSectionTheme;
  children: ReactNode;
}) {
  return (
    <section className={`biodata-pdf-section biodata-pdf-section-${theme}`}>
      <div className={`biodata-pdf-section-head biodata-pdf-section-head-${theme}`}>
        <h2 className="biodata-pdf-section-title">{title}</h2>
      </div>
      <div className="biodata-pdf-section-body">{children}</div>
    </section>
  );
}

export const BiodataPdfDocument = forwardRef<HTMLElement, BiodataPdfDocumentProps>(
  function BiodataPdfDocument(
    { data, token, dropdowns, photoPath = photoFileUrl, fetchBlob },
    ref,
  ) {
    const articleRef = useRef<HTMLElement>(null);
    useImperativeHandle(ref, () => articleRef.current as HTMLElement);

    const locale = useLocale();
    const t = useTranslations("biodataExport");
    const tp = useTranslations("admin.privacyFields.fields");
    const tf = useTranslations("profile.fields");
    const tpriv = useTranslations("privacy");

    const resolveStaticOption = createFieldOptionResolver((relativeKey) =>
      tf(relativeKey as never),
    );

    const formatValue = (key: string, value: unknown) =>
      formatBiodataFieldValue(key, value, {
        locale,
        dropdowns,
        personal: data.personal,
        resolveStaticOption,
        yesLabel: t("yes"),
        noLabel: t("no"),
      });

    const labelForPrivacyField = (key: string) => {
      const labelKey = resolvePrivacyLabelKey(key);
      if (KNOWN_PRIVACY_FIELD_KEYS.has(labelKey)) {
        return tp(labelKey as never);
      }
      return humanizeFieldKey(labelKey);
    };

    const labelForPartnerField = (key: string) => {
      if (KNOWN_PARTNER_FIELD_KEYS.has(key)) {
        return t(`partnerFields.${key}` as never);
      }
      return humanizeFieldKey(key);
    };

    const labelForSiblingField = (key: string) => {
      if (KNOWN_SIBLING_FIELD_KEYS.has(key)) {
        return tf(key as never);
      }
      return humanizeFieldKey(key);
    };

    const labelForRelativeField = (key: string) => {
      if (KNOWN_RELATIVE_FIELD_KEYS.has(key)) {
        return tf(key as never);
      }
      return humanizeFieldKey(key);
    };

    const formatRelativeValue = (
      key: string,
      value: unknown,
      relationGroup: string,
    ) =>
      formatBiodataFieldValue(key, value, {
        locale,
        dropdowns,
        personal: data.personal,
        resolveStaticOption,
        yesLabel: t("yes"),
        noLabel: t("no"),
        relativeRelationGroup: relationGroup,
        translateField: (fieldKey) => tf(fieldKey as never),
      });

    const buildRows = (
      entries: [string, unknown][],
      labelForKey: (key: string) => string,
    ) =>
      entries
        .filter(([key]) => !SKIP_VALUE_KEYS.has(key))
        .map(([key, value]) => ({
          key,
          label: labelForKey(key),
          value: formatValue(key, value),
        }));

    const personalEntries = Object.entries(data.personal);
    const familyEntries = data.family
      ? Object.entries(data.family).filter(
          ([, value]) => value !== null && value !== undefined && value !== "",
        )
      : [];
    const maritalEntries = data.marital
      ? Object.entries(data.marital).filter(
          ([, value]) => value !== null && value !== undefined && value !== "",
        )
      : [];
    const partnerEntries = data.partner
      ? Object.entries(data.partner).filter(
          ([, value]) => value !== null && value !== undefined && value !== "",
        )
      : [];

    const displayName =
      typeof data.personal.full_name === "string" && data.personal.full_name.trim()
        ? data.personal.full_name.trim()
        : t("documentTitle");

    const galleryIds = data.media.galleryPhotoIds ?? [];
    const generatedLabel = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(data.generatedAt));

    const formatAuditDate = (iso: string | null) =>
      iso
        ? new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(iso))
        : t("notAvailable");

    const audit = data.verification;

    const isEmpty =
      personalEntries.length === 0 &&
      familyEntries.length === 0 &&
      maritalEntries.length === 0 &&
      !data.siblings?.length &&
      !data.paternalRelatives?.length &&
      !data.maternalRelatives?.length &&
      partnerEntries.length === 0 &&
      !data.media.primaryPhotoId;

    return (
      <>
      <style dangerouslySetInnerHTML={{ __html: BIODATA_PDF_CSS }} />
      <article ref={articleRef} className="biodata-pdf-root">
        <header className="biodata-pdf-header">
          <div className="biodata-pdf-header-row">
            <div className="biodata-pdf-header-main">
              <p className="biodata-pdf-brand">{t("brand")}</p>
              <h1 className="biodata-pdf-title">{displayName}</h1>
              <dl className="biodata-pdf-meta">
                <div className="biodata-pdf-meta-row">
                  <dt className="biodata-pdf-meta-label">{t("profileIdLabel")}</dt>
                  <dd>{data.profileCode}</dd>
                </div>
                <div className="biodata-pdf-meta-row">
                  <dt className="biodata-pdf-meta-label">{t("privacyLevelLabel")}</dt>
                  <dd>
                    {t("privacyLevelShort", {
                      level: data.privacyLevel,
                      label: tpriv(String(data.privacyLevel)),
                    })}
                  </dd>
                </div>
                <div className="biodata-pdf-meta-row">
                  <dt className="biodata-pdf-meta-label">{t("generatedLabel")}</dt>
                  <dd>{generatedLabel}</dd>
                </div>
              </dl>
              {data.media.isVerified ? (
                <span className="biodata-pdf-badge">
                  {data.media.verifiedOnBehalf && data.media.memberNidVerified
                    ? t("verifiedOnBehalfDualNidYes")
                    : data.media.verifiedOnBehalf
                      ? t("verifiedOnBehalfYes")
                      : t("verifiedYes")}
                </span>
              ) : null}
            </div>
            {data.media.primaryPhotoId ? (
              <div className="biodata-pdf-photo-wrap">
                <AuthenticatedBlobImage
                  token={token}
                  path={photoPath(data.media.primaryPhotoId)}
                  alt={t("primaryPhotoAlt")}
                  className="biodata-pdf-photo"
                  fetchBlob={fetchBlob}
                />
              </div>
            ) : null}
          </div>
          <p className="biodata-pdf-hint">
            {data.auditRecord ? t("auditCumulativeHint") : t("cumulativeHint")}
          </p>
        </header>

        {data.auditRecord && audit ? (
          <Section title={t("auditSectionTitle")} theme="personal">
            <BiodataFieldRows
              variant="pdf"
              theme="personal"
              rows={[
                {
                  key: "auditPhone",
                  label: t("auditPhoneLabel"),
                  value: audit.phone,
                },
                {
                  key: "auditPhoneVerified",
                  label: t("auditPhoneVerifiedLabel"),
                  value: audit.phoneVerifiedAt
                    ? formatAuditDate(audit.phoneVerifiedAt)
                    : t("no"),
                },
                {
                  key: "auditBiodataStatus",
                  label: t("auditBiodataStatusLabel"),
                  value: audit.profileBiodataReviewStatus ?? t("notAvailable"),
                },
                {
                  key: "auditBiodataReviewedAt",
                  label: t("auditBiodataReviewedAtLabel"),
                  value: formatAuditDate(audit.profileBiodataReviewedAt),
                },
                {
                  key: "auditMemberNid",
                  label: t("auditMemberNidLabel"),
                  value: audit.nidVerifiedAt
                    ? formatAuditDate(audit.nidVerifiedAt)
                    : t("no"),
                },
                ...(audit.verifiedOnBehalf
                  ? [
                      {
                        key: "auditCreatorNid",
                        label: t("auditCreatorNidLabel"),
                        value: audit.creatorNidVerifiedAt
                          ? formatAuditDate(audit.creatorNidVerifiedAt)
                          : t("no"),
                      },
                    ]
                  : []),
                {
                  key: "auditFullyVerified",
                  label: t("auditFullyVerifiedLabel"),
                  value: audit.isVerified ? t("yes") : t("no"),
                },
                ...audit.nidDocuments.map((doc, index) => ({
                  key: `auditNid-${index}`,
                  label: t("auditNidDocumentLabel", {
                    subject: doc.subject,
                    side: doc.side,
                  }),
                  value: doc.status,
                })),
              ]}
            />
          </Section>
        ) : null}

        {buildRows(personalEntries, labelForPrivacyField).length > 0 ? (
          <Section
            title={t("sections.personal")}
            theme={biodataThemeForSection("personal")}
          >
            <BiodataFieldRows
              variant="pdf"
              theme={biodataThemeForSection("personal")}
              rows={buildRows(personalEntries, labelForPrivacyField)}
            />
          </Section>
        ) : null}

        {buildRows(familyEntries, labelForPrivacyField).length > 0 ? (
          <Section
            title={t("sections.family")}
            theme={biodataThemeForSection("family")}
          >
            <BiodataFieldRows
              variant="pdf"
              theme={biodataThemeForSection("family")}
              rows={buildRows(familyEntries, labelForPrivacyField)}
            />
          </Section>
        ) : null}

        {buildRows(maritalEntries, labelForPrivacyField).length > 0 ? (
          <Section
            title={t("sections.marital")}
            theme={biodataThemeForSection("marital")}
          >
            <BiodataFieldRows
              variant="pdf"
              theme={biodataThemeForSection("marital")}
              rows={buildRows(maritalEntries, labelForPrivacyField)}
            />
          </Section>
        ) : null}

        {data.siblings && data.siblings.length > 0 ? (
          <Section
            title={t("sections.siblings")}
            theme={biodataThemeForSection("siblings")}
          >
            <div className="biodata-pdf-siblings">
              {data.siblings.map((sibling, index) => {
                const rows = buildRows(
                  Object.entries(sibling),
                  labelForSiblingField,
                );
                return (
                  <div key={index}>
                    <p className="biodata-pdf-sibling-label">
                      {t("siblingNumber", { number: index + 1 })}
                    </p>
                    <BiodataFieldRows
                      variant="pdf"
                      theme={biodataThemeForSection("siblings")}
                      rows={rows}
                    />
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}

        {data.paternalRelatives && data.paternalRelatives.length > 0 ? (
          <Section
            title={t("sections.paternalRelatives")}
            theme={biodataThemeForSection("paternal_relatives")}
          >
            <div className="biodata-pdf-siblings">
              {data.paternalRelatives.map((relative, index) => {
                const rows = Object.entries(relative)
                  .filter(([key]) => !SKIP_VALUE_KEYS.has(key))
                  .map(([key, value]) => ({
                    key,
                    label: labelForRelativeField(key),
                    value: formatRelativeValue(
                      key,
                      value,
                      "paternalRelativeRelationOptions",
                    ),
                  }));
                return (
                  <div key={index}>
                    <p className="biodata-pdf-sibling-label">
                      {t("relativeNumber", { number: index + 1 })}
                    </p>
                    <BiodataFieldRows
                      variant="pdf"
                      theme={biodataThemeForSection("paternal_relatives")}
                      rows={rows}
                    />
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}

        {data.maternalRelatives && data.maternalRelatives.length > 0 ? (
          <Section
            title={t("sections.maternalRelatives")}
            theme={biodataThemeForSection("maternal_relatives")}
          >
            <div className="biodata-pdf-siblings">
              {data.maternalRelatives.map((relative, index) => {
                const rows = Object.entries(relative)
                  .filter(([key]) => !SKIP_VALUE_KEYS.has(key))
                  .map(([key, value]) => ({
                    key,
                    label: labelForRelativeField(key),
                    value: formatRelativeValue(
                      key,
                      value,
                      "maternalRelativeRelationOptions",
                    ),
                  }));
                return (
                  <div key={index}>
                    <p className="biodata-pdf-sibling-label">
                      {t("relativeNumber", { number: index + 1 })}
                    </p>
                    <BiodataFieldRows
                      variant="pdf"
                      theme={biodataThemeForSection("maternal_relatives")}
                      rows={rows}
                    />
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}

        {buildRows(partnerEntries, labelForPartnerField).length > 0 ? (
          <Section
            title={t("sections.partner")}
            theme={biodataThemeForSection("partner")}
          >
            <BiodataFieldRows
              variant="pdf"
              theme={biodataThemeForSection("partner")}
              rows={buildRows(partnerEntries, labelForPartnerField)}
            />
          </Section>
        ) : null}

        {data.media.phone || galleryIds.length > 0 ? (
          <Section
            title={t("sections.contact")}
            theme={biodataThemeForSection("contact")}
          >
            <BiodataFieldRows
              variant="pdf"
              theme={biodataThemeForSection("contact")}
              rows={
                data.media.phone
                  ? [
                      {
                        key: "phone",
                        label: labelForPrivacyField("phone"),
                        value: data.media.phone,
                      },
                    ]
                  : []
              }
            />
            {galleryIds.length > 0 ? (
              <div className="biodata-pdf-gallery">
                {galleryIds.map((photoId, index) => (
                  <AuthenticatedBlobImage
                    key={photoId}
                    token={token}
                    path={photoPath(photoId)}
                    alt={index === 0 ? t("otherPhotoAlt") : t("familyPhotoAlt")}
                    className="biodata-pdf-gallery-photo"
                    fetchBlob={fetchBlob}
                  />
                ))}
              </div>
            ) : null}
          </Section>
        ) : null}

        {isEmpty ? (
          <p className="biodata-pdf-empty">{t("emptyAtLevel")}</p>
        ) : null}

        <footer className="biodata-pdf-footer">
          {data.auditRecord ? t("auditFooter") : t("footer")}
        </footer>
      </article>
      </>
    );
  },
);
