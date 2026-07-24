import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { DropdownsService } from '../dropdowns/dropdowns.service';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  biodataAuditExportInclude,
  buildAuditBiodataExport,
} from '../profiles/biodata-audit-export';
import {
  formatBiodataFieldValueForExport,
  formatBiodataRecordsForExport,
  formatBiodataSectionForExport,
  formatNidDocumentsForExport,
  type DropdownMap,
} from '../profiles/biodata-field-format';
import {
  buildPublicBrowseProfileWhere,
  type DiscoveryFilterInput,
} from '../discovery/discovery-filters';
import { buildCsvDocument } from './csv-serialize';

const MAX_EXPORT_ROWS = 5_000;
const EXPORT_BATCH_SIZE = 200;

const META_COLUMNS = [
  'profile_id',
  'profile_code',
  'phone',
  'phone_verified_at',
  'is_verified',
  'verified_on_behalf',
  'creation_mode',
  'on_behalf_relation',
  'nid_verified_at',
  'creator_nid_verified_at',
  'biodata_review_status',
  'biodata_reviewed_at',
  'nid_documents_json',
] as const;

const ARRAY_COLUMNS = [
  'siblings_json',
  'paternal_relatives_json',
  'maternal_relatives_json',
] as const;

type AuditExportRow = ReturnType<typeof buildAuditBiodataExport>;

@Injectable()
export class AdminBiodataCsvExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly privacyFields: PrivacyFieldsService,
    private readonly dropdownsService: DropdownsService,
  ) {}

  async exportCsv(
    filters: DiscoveryFilterInput,
    locale = 'en',
  ): Promise<{
    csv: string;
    rowCount: number;
    truncated: boolean;
  }> {
    if (!filters.gender) {
      throw new BadRequestException(
        'gender is required (male or female) for biodata export',
      );
    }

    const [rules, dropdowns] = await Promise.all([
      this.privacyFields.listAll(),
      this.dropdownsService.getPublicDropdowns(undefined, locale),
    ]);
    const dropdownMap = dropdowns as DropdownMap;
    const privacyRules = rules.map((row) => ({
      fieldKey: row.fieldKey,
      isShareable: row.isShareable,
      minPrivacyLevel: row.minPrivacyLevel,
    }));

    const where = buildPublicBrowseProfileWhere(filters);
    const total = await this.prisma.profile.count({ where });
    const exportLimit = Math.min(total, MAX_EXPORT_ROWS);
    const truncated = total > MAX_EXPORT_ROWS;

    const prefixedColumns = new Set<string>();
    const flatRows: Record<string, string>[] = [];

    for (let skip = 0; skip < exportLimit; skip += EXPORT_BATCH_SIZE) {
      const batch = await this.prisma.profile.findMany({
        where,
        include: biodataAuditExportInclude,
        orderBy: [{ updatedAt: 'desc' }, { profileCode: 'asc' }],
        skip,
        take: Math.min(EXPORT_BATCH_SIZE, exportLimit - skip),
      });

      for (const profile of batch) {
        const exportRow = buildAuditBiodataExport(profile, privacyRules);
        const flat = this.flattenAuditExport(exportRow, dropdownMap, locale);
        for (const key of Object.keys(flat)) {
          prefixedColumns.add(key);
        }
        flatRows.push(flat);
      }
    }

    const dynamicColumns = [...prefixedColumns]
      .filter(
        (key) =>
          !META_COLUMNS.includes(key as (typeof META_COLUMNS)[number]) &&
          !ARRAY_COLUMNS.includes(key as (typeof ARRAY_COLUMNS)[number]),
      )
      .sort();

    const headers = [...META_COLUMNS, ...dynamicColumns, ...ARRAY_COLUMNS];
    const rows = flatRows.map((flat) =>
      headers.map((header) => flat[header] ?? ''),
    );

    return {
      csv: buildCsvDocument(headers, rows),
      rowCount: flatRows.length,
      truncated,
    };
  }

  private flattenAuditExport(
    exportRow: AuditExportRow,
    dropdowns: DropdownMap,
    locale: string,
  ): Record<string, string> {
    const personal = exportRow.personal;
    const flat: Record<string, string> = {
      profile_id: exportRow.profileId,
      profile_code: exportRow.profileCode,
    };

    const verification = exportRow.verification;
    if (verification) {
      flat.phone = verification.phone ?? '';
      flat.phone_verified_at = verification.phoneVerifiedAt ?? '';
      flat.is_verified = formatBiodataFieldValueForExport(
        'is_verified',
        verification.isVerified,
        { dropdowns, locale },
      );
      flat.verified_on_behalf = formatBiodataFieldValueForExport(
        'verified_on_behalf',
        verification.verifiedOnBehalf,
        { dropdowns, locale },
      );
      flat.creation_mode = formatBiodataFieldValueForExport(
        'creation_mode',
        verification.creationMode,
        { dropdowns, locale },
      );
      flat.on_behalf_relation = formatBiodataFieldValueForExport(
        'on_behalf_relation',
        verification.onBehalfRelation,
        { dropdowns, locale },
      );
      flat.nid_verified_at = verification.nidVerifiedAt ?? '';
      flat.creator_nid_verified_at = verification.creatorNidVerifiedAt ?? '';
      flat.biodata_review_status = formatBiodataFieldValueForExport(
        'biodata_review_status',
        verification.profileBiodataReviewStatus,
        { dropdowns, locale },
      );
      flat.biodata_reviewed_at = verification.profileBiodataReviewedAt ?? '';
      flat.nid_documents_json = formatNidDocumentsForExport(
        verification.nidDocuments,
      );
    }

    this.addPrefixedSection(flat, 'personal', personal, dropdowns, locale);
    if (exportRow.marital) {
      this.addPrefixedSection(
        flat,
        'marital',
        exportRow.marital,
        dropdowns,
        locale,
        personal,
      );
    }
    if (exportRow.family) {
      this.addPrefixedSection(
        flat,
        'family',
        exportRow.family,
        dropdowns,
        locale,
        personal,
      );
    }
    if (exportRow.partner) {
      this.addPrefixedSection(
        flat,
        'partner',
        exportRow.partner,
        dropdowns,
        locale,
        personal,
      );
    }

    flat.siblings_json = formatBiodataRecordsForExport(
      exportRow.siblings,
      dropdowns,
      personal,
    );
    flat.paternal_relatives_json = formatBiodataRecordsForExport(
      exportRow.paternalRelatives,
      dropdowns,
      personal,
      'paternal',
    );
    flat.maternal_relatives_json = formatBiodataRecordsForExport(
      exportRow.maternalRelatives,
      dropdowns,
      personal,
      'maternal',
    );

    return flat;
  }

  private addPrefixedSection(
    flat: Record<string, string>,
    prefix: string,
    section: Record<string, unknown>,
    dropdowns: DropdownMap,
    locale: string,
    personal?: Record<string, unknown>,
  ) {
    const formatted = formatBiodataSectionForExport(
      section,
      dropdowns,
      personal ?? section,
    );
    for (const [key, value] of Object.entries(formatted)) {
      flat[`${prefix}_${key}`] = value;
    }
  }
}
