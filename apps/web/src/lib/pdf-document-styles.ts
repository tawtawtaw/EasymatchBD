/** Hex/rgb only — injected into html2canvas clones (Tailwind v4 uses oklch). */

export const BIODATA_PDF_CSS = `
.biodata-pdf-root {
  max-width: 210mm;
  margin-left: auto;
  margin-right: auto;
  background-color: #ffffff;
  color: #18181b;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}

.biodata-pdf-header {
  overflow: hidden;
  border-radius: 0.75rem;
  border: 2px solid #9f1239;
}

.biodata-pdf-header-row {
  display: flex;
  flex-direction: column;
}

@media (min-width: 640px) {
  .biodata-pdf-header-row {
    flex-direction: row;
  }
}

.biodata-pdf-header-main {
  flex: 1;
  background-color: #9f1239;
  color: #ffffff;
  padding: 1.25rem 1.5rem;
}

.biodata-pdf-brand {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #ffe4e6;
}

.biodata-pdf-title {
  margin-top: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
}

.biodata-pdf-meta {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #fff1f2;
}

.biodata-pdf-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.5rem;
  margin-bottom: 0.375rem;
}

.biodata-pdf-meta-label {
  font-weight: 600;
  color: #ffe4e6;
}

.biodata-pdf-badge {
  display: inline-flex;
  margin-top: 1rem;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.15);
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #ffffff;
}

.biodata-pdf-photo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #be123c;
  background-color: #ffffff;
  padding: 1rem;
}

@media (min-width: 640px) {
  .biodata-pdf-photo-wrap {
    width: 10rem;
    border-top: none;
    border-left: 1px solid #be123c;
  }
}

.biodata-pdf-photo {
  height: 9rem;
  width: 7rem;
  border-radius: 0.375rem;
  border: 1px solid #e4e4e7;
  object-fit: cover;
}

.biodata-pdf-photo-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f4f4f5;
  color: #71717a;
  font-size: 0.75rem;
}

.biodata-pdf-hint {
  border-top: 1px solid #be123c;
  background-color: #fff1f2;
  padding: 0.5rem 1.25rem;
  font-size: 0.75rem;
  color: #881337;
}

.biodata-pdf-section {
  margin-top: 1.5rem;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid #e4e4e7;
  background-color: #ffffff;
}

.biodata-pdf-section-head {
  padding: 0.625rem 1rem;
}

.biodata-pdf-section-head-rose {
  background-color: #9f1239;
}

.biodata-pdf-section-head-emerald {
  background-color: #065f46;
}

.biodata-pdf-section-head-sky {
  background-color: #075985;
}

.biodata-pdf-section-head-amber {
  background-color: #92400e;
}

.biodata-pdf-section-head-violet {
  background-color: #5b21b6;
}

.biodata-pdf-section-head-teal {
  background-color: #115e59;
}

.biodata-pdf-section-title {
  font-size: 0.9375rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ffffff;
}

.biodata-pdf-section-body {
  padding: 0.875rem 1rem 1rem;
}

.biodata-pdf-field-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.biodata-pdf-field-row {
  display: flex;
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid #e4e4e7;
}

.biodata-pdf-field-label {
  width: 38%;
  flex-shrink: 0;
  border-right: 1px solid #e4e4e7;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.4;
}

.biodata-pdf-field-value {
  flex: 1;
  min-width: 0;
  background-color: #ffffff;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #18181b;
}

.biodata-pdf-field-row-rose .biodata-pdf-field-label {
  background-color: #ffe4e6;
  color: #881337;
  border-left: 4px solid #be123c;
}

.biodata-pdf-field-row-emerald .biodata-pdf-field-label {
  background-color: #d1fae5;
  color: #064e3b;
  border-left: 4px solid #059669;
}

.biodata-pdf-field-row-sky .biodata-pdf-field-label {
  background-color: #e0f2fe;
  color: #0c4a6e;
  border-left: 4px solid #0284c7;
}

.biodata-pdf-field-row-amber .biodata-pdf-field-label {
  background-color: #fef3c7;
  color: #78350f;
  border-left: 4px solid #d97706;
}

.biodata-pdf-field-row-violet .biodata-pdf-field-label {
  background-color: #ede9fe;
  color: #4c1d95;
  border-left: 4px solid #7c3aed;
}

.biodata-pdf-field-row-teal .biodata-pdf-field-label {
  background-color: #ccfbf1;
  color: #134e4a;
  border-left: 4px solid #0d9488;
}

.biodata-pdf-field-row-even {
  background-color: #ffffff;
}

.biodata-pdf-field-row-odd {
  background-color: #fafafa;
}

.biodata-pdf-siblings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.biodata-pdf-sibling-label {
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #71717a;
}

.biodata-pdf-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.biodata-pdf-gallery-photo {
  height: 7rem;
  width: 7rem;
  border-radius: 0.375rem;
  border: 1px solid #e4e4e7;
  object-fit: cover;
}

.biodata-pdf-empty {
  margin-top: 2.5rem;
  border-radius: 0.5rem;
  border: 1px dashed #d4d4d8;
  background-color: #fafafa;
  padding: 2rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #71717a;
}

.biodata-pdf-footer {
  margin-top: 2rem;
  border-top: 1px solid #e4e4e7;
  padding-top: 1rem;
  text-align: center;
  font-size: 11px;
  line-height: 1.625;
  color: #71717a;
}
`.trim();

export const MEMBERSHIP_RECEIPT_CSS = `
.membership-receipt-root {
  max-width: 210mm;
  margin-left: auto;
  margin-right: auto;
  background-color: #ffffff;
  color: #18181b;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}

.membership-receipt-header {
  overflow: hidden;
  border-radius: 0.75rem;
  border: 2px solid #9f1239;
}

.membership-receipt-header-main {
  background-color: #9f1239;
  color: #ffffff;
  padding: 1.25rem 1.5rem;
}

.membership-receipt-brand {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #ffe4e6;
}

.membership-receipt-title {
  margin-top: 0.5rem;
  font-size: 1.375rem;
  font-weight: 700;
}

.membership-receipt-subtitle {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #fff1f2;
}

.membership-receipt-paid-banner {
  border-top: 1px solid #be123c;
  background-color: #ecfdf5;
  padding: 0.5rem 1.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #065f46;
}

.membership-receipt-section {
  margin-top: 1.25rem;
}

.membership-receipt-section-title {
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #881337;
}

.membership-receipt-table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid #e4e4e7;
  font-size: 0.875rem;
}

.membership-receipt-row-even {
  background-color: #ffffff;
}

.membership-receipt-row-odd {
  background-color: #fff1f2;
}

.membership-receipt-th {
  width: 38%;
  border-bottom: 1px solid #fecdd3;
  padding: 0.625rem 0.75rem;
  text-align: left;
  vertical-align: top;
  font-weight: 600;
  color: #881337;
  background-color: #ffe4e6;
}

.membership-receipt-td {
  border-bottom: 1px solid #e4e4e7;
  padding: 0.625rem 0.75rem;
  vertical-align: top;
  color: #18181b;
}

.membership-receipt-footer {
  margin-top: 1.5rem;
  border-top: 1px solid #e4e4e7;
  padding-top: 0.75rem;
  font-size: 11px;
  line-height: 1.5;
  color: #71717a;
  text-align: center;
}

.membership-receipt-amount {
  margin-top: 1rem;
  border-radius: 0.5rem;
  border: 2px solid #9f1239;
  background-color: #fff1f2;
  padding: 0.875rem 1rem;
  text-align: center;
}

.membership-receipt-amount-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #881337;
}

.membership-receipt-amount-value {
  margin-top: 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #9f1239;
}
`.trim();
