import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PROFILE_PRIVACY_FIELD_META,
  PROFILE_PRIVACY_FIELDS,
  ProfilePrivacyFieldKey,
  resolveVisibleFullName,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrivacyFieldsService {
  private listCache: ReturnType<PrivacyFieldsService['toDto']>[] | null = null;
  private syncChecked = false;

  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<ReturnType<PrivacyFieldsService['toDto']>[]> {
    if (this.listCache) {
      return this.listCache;
    }

    await this.ensurePrivacyFieldsSynced();
    const rows = await this.prisma.profileFieldPrivacy.findMany({
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
    });
    const mapped = rows.map((row) => this.toDto(row));
    this.listCache = mapped;
    return mapped;
  }

  async getFullNameRule() {
    const rules = await this.listAll();
    const rule = rules.find(
      (row) => row.fieldKey === PROFILE_PRIVACY_FIELDS.FULL_NAME,
    );
    if (rule) {
      return {
        isShareable: rule.isShareable,
        minPrivacyLevel: rule.minPrivacyLevel,
      };
    }
    const meta = PROFILE_PRIVACY_FIELD_META[PROFILE_PRIVACY_FIELDS.FULL_NAME];
    return {
      isShareable: meta.defaultShareable,
      minPrivacyLevel: meta.defaultMinLevel,
    };
  }

  async resolveVisibleFullName(
    fullName: string | null | undefined,
    viewerPrivacyLevel: number,
  ) {
    const rule = await this.getFullNameRule();
    return resolveVisibleFullName(fullName, viewerPrivacyLevel, rule);
  }

  async bulkUpdate(
    updates: {
      fieldKey: string;
      isShareable: boolean;
      minPrivacyLevel: number;
    }[],
  ) {
    await this.ensurePrivacyFieldsSynced();

    for (const update of updates) {
      this.assertKnownField(update.fieldKey);
      if (update.minPrivacyLevel < 0 || update.minPrivacyLevel > 3) {
        throw new BadRequestException(
          `minPrivacyLevel must be between 0 and 3 for ${update.fieldKey}`,
        );
      }
    }

    await this.prisma.$executeRaw`
      UPDATE "ProfileFieldPrivacy" AS p
      SET
        "isShareable" = v.is_shareable,
        "minPrivacyLevel" = v.min_level,
        "updatedAt" = NOW()
      FROM (
        SELECT * FROM UNNEST(
          ${updates.map((update) => update.fieldKey)}::text[],
          ${updates.map((update) => update.isShareable)}::boolean[],
          ${updates.map(
            (update) =>
              update.isShareable ? update.minPrivacyLevel : 0,
          )}::int[]
        ) AS t(field_key, is_shareable, min_level)
      ) AS v
      WHERE p."fieldKey" = v.field_key
    `;

    this.invalidateCache();
    return this.listAll();
  }

  private invalidateCache() {
    this.listCache = null;
  }

  private async ensurePrivacyFieldsSynced() {
    if (this.syncChecked) {
      return;
    }

    const metaEntries = Object.entries(PROFILE_PRIVACY_FIELD_META);
    let rows = await this.prisma.profileFieldPrivacy.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    if (rows.length === 0) {
      let order = 0;
      for (const [fieldKey, meta] of metaEntries) {
        await this.prisma.profileFieldPrivacy.create({
          data: {
            fieldKey,
            section: meta.section,
            isShareable: meta.defaultShareable,
            minPrivacyLevel: meta.defaultMinLevel,
            sortOrder: order++,
          },
        });
      }
      this.syncChecked = true;
      return;
    }

    const existingKeys = new Set(rows.map((row) => row.fieldKey));
    const missing = metaEntries.filter(([fieldKey]) => !existingKeys.has(fieldKey));
    if (missing.length === 0) {
      this.syncChecked = true;
      return;
    }

    for (const [fieldKey, meta] of missing) {
      const metaIndex = metaEntries.findIndex(([key]) => key === fieldKey);
      let insertAfterSort = -1;
      for (let i = metaIndex - 1; i >= 0; i--) {
        const prevKey = metaEntries[i][0];
        const prevRow = rows.find((row) => row.fieldKey === prevKey);
        if (prevRow) {
          insertAfterSort = prevRow.sortOrder;
          break;
        }
      }
      const newSortOrder =
        insertAfterSort >= 0
          ? insertAfterSort + 1
          : Math.max(...rows.map((row) => row.sortOrder), -1) + 1;

      await this.prisma.$transaction(async (tx) => {
        await tx.profileFieldPrivacy.updateMany({
          where: { sortOrder: { gte: newSortOrder } },
          data: { sortOrder: { increment: 1 } },
        });
        await tx.profileFieldPrivacy.create({
          data: {
            fieldKey,
            section: meta.section,
            isShareable: meta.defaultShareable,
            minPrivacyLevel: meta.defaultMinLevel,
            sortOrder: newSortOrder,
          },
        });
      });

      rows = await this.prisma.profileFieldPrivacy.findMany({
        orderBy: { sortOrder: 'asc' },
      });
    }

    this.syncChecked = true;
    if (missing.length > 0) {
      this.invalidateCache();
    }
  }

  private assertKnownField(fieldKey: string) {
    if (!(fieldKey in PROFILE_PRIVACY_FIELD_META)) {
      throw new BadRequestException(`Unknown profile field: ${fieldKey}`);
    }
  }

  private toDto(row: {
    fieldKey: string;
    section: string;
    isShareable: boolean;
    minPrivacyLevel: number;
    sortOrder: number;
    updatedAt: Date;
  }) {
    return {
      fieldKey: row.fieldKey as ProfilePrivacyFieldKey,
      section: row.section,
      isShareable: row.isShareable,
      minPrivacyLevel: row.minPrivacyLevel,
      sortOrder: row.sortOrder,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
