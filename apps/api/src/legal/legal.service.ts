import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  DEFAULT_TERMS_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_EFFECTIVE_DATE_BN,
  TERMS_SECTIONS,
  TERMS_SECTIONS_BN,
  type TermsSection,
} from '@easymatch/shared';
import { Prisma, TermsAuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveTermsDraftDto } from './dto/save-terms-draft.dto';

const SINGLETON_ID = 'singleton';
const SCHEDULE_CHECK_MS = 60_000;

export type PublishedTermsResponse = {
  version: string;
  effectiveDate: string;
  sections: TermsSection[];
  publishedAt: string;
  isDraftPreview?: boolean;
};

export type TermsScheduleInfo = {
  scheduledPublishAt: string;
  scheduledBy: {
    id: string;
    email: string | null;
    phone: string | null;
  } | null;
} | null;

export type TermsAuditEntry = {
  id: string;
  action: TermsAuditAction;
  version: string;
  effectiveDateEn: string | null;
  effectiveDateBn: string | null;
  scheduledFor: string | null;
  performedAt: string;
  performedBy: {
    id: string;
    email: string | null;
    phone: string | null;
  } | null;
};

export type AdminTermsState = {
  published: {
    version: string;
    effectiveDateEn: string;
    effectiveDateBn: string;
    sectionsEn: TermsSection[];
    sectionsBn: TermsSection[];
    publishedAt: string;
  };
  draft: {
    version: string;
    effectiveDateEn: string;
    effectiveDateBn: string;
    sectionsEn: TermsSection[];
    sectionsBn: TermsSection[];
  };
  hasDraftChanges: boolean;
  schedule: TermsScheduleInfo;
};

@Injectable()
export class LegalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LegalService.name);
  private scheduleTimer: ReturnType<typeof setInterval> | null = null;
  private cachedVersion: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.initializeAtStartup();

    this.scheduleTimer = setInterval(() => {
      void this.processScheduledPublishIfDue();
    }, SCHEDULE_CHECK_MS);
  }

  private async initializeAtStartup() {
    try {
      await this.ensureSeeded();
      await this.refreshVersionCache();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Terms settings unavailable at startup (${message}). Using default terms version until the database is reachable.`,
      );
      this.cachedVersion = DEFAULT_TERMS_VERSION;
    }
  }

  onModuleDestroy() {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }
  }

  async ensureSeeded() {
    const existing = await this.prisma.termsSettings.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (existing) return;

    const now = new Date();
    await this.prisma.termsSettings.create({
      data: {
        id: SINGLETON_ID,
        version: DEFAULT_TERMS_VERSION,
        effectiveDateEn: TERMS_EFFECTIVE_DATE,
        effectiveDateBn: TERMS_EFFECTIVE_DATE_BN,
        sectionsEn: TERMS_SECTIONS as unknown as Prisma.InputJsonValue,
        sectionsBn: TERMS_SECTIONS_BN as unknown as Prisma.InputJsonValue,
        publishedAt: now,
      },
    });
  }

  async getCurrentVersion(): Promise<string> {
    if (this.cachedVersion) {
      return this.cachedVersion;
    }

    await this.processScheduledPublishIfDue();
    await this.refreshVersionCache();
    return this.cachedVersion ?? DEFAULT_TERMS_VERSION;
  }

  private async refreshVersionCache() {
    try {
      await this.ensureSeeded();
      const row = await this.prisma.termsSettings.findUniqueOrThrow({
        where: { id: SINGLETON_ID },
        select: { version: true },
      });
      this.cachedVersion = row.version;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Could not refresh terms version (${message}). Keeping cached/default version.`,
      );
      this.cachedVersion ??= DEFAULT_TERMS_VERSION;
    }
  }

  async getPublishedTerms(locale: string): Promise<PublishedTermsResponse> {
    await this.processScheduledPublishIfDue();
    await this.ensureSeeded();
    const row = await this.prisma.termsSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });
    const isBn = locale === 'bn';

    return {
      version: row.version,
      effectiveDate: isBn ? row.effectiveDateBn : row.effectiveDateEn,
      sections: (isBn ? row.sectionsBn : row.sectionsEn) as TermsSection[],
      publishedAt: row.publishedAt.toISOString(),
    };
  }

  async getDraftPreview(locale: string): Promise<PublishedTermsResponse> {
    await this.ensureSeeded();
    const row = await this.prisma.termsSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });
    const isBn = locale === 'bn';
    const draft = this.resolveDraft(row);

    return {
      version: draft.version,
      effectiveDate: isBn ? draft.effectiveDateBn : draft.effectiveDateEn,
      sections: (isBn ? draft.sectionsBn : draft.sectionsEn) as TermsSection[],
      publishedAt: row.publishedAt.toISOString(),
      isDraftPreview: true,
    };
  }

  async getAdminState(): Promise<AdminTermsState> {
    await this.processScheduledPublishIfDue();
    await this.ensureSeeded();
    const row = await this.prisma.termsSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
      include: {
        scheduledBy: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    return this.toAdminState(row);
  }

  async getAuditLog(limit = 50): Promise<TermsAuditEntry[]> {
    const rows = await this.prisma.termsAuditLog.findMany({
      take: limit,
      orderBy: { performedAt: 'desc' },
      include: {
        performedBy: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      version: row.version,
      effectiveDateEn: row.effectiveDateEn,
      effectiveDateBn: row.effectiveDateBn,
      scheduledFor: row.scheduledFor?.toISOString() ?? null,
      performedAt: row.performedAt.toISOString(),
      performedBy: row.performedBy
        ? {
            id: row.performedBy.id,
            email: row.performedBy.email,
            phone: row.performedBy.phone,
          }
        : null,
    }));
  }

  async saveDraft(dto: SaveTermsDraftDto) {
    this.assertValidSections(dto.sectionsEn, 'sectionsEn');
    this.assertValidSections(dto.sectionsBn, 'sectionsBn');

    await this.ensureSeeded();
    const updated = await this.prisma.termsSettings.update({
      where: { id: SINGLETON_ID },
      data: {
        draftVersion: dto.version.trim(),
        draftEffectiveDateEn: dto.effectiveDateEn.trim(),
        draftEffectiveDateBn: dto.effectiveDateBn.trim(),
        draftSectionsEn: dto.sectionsEn as unknown as Prisma.InputJsonValue,
        draftSectionsBn: dto.sectionsBn as unknown as Prisma.InputJsonValue,
      },
      include: {
        scheduledBy: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    return this.toAdminState(updated);
  }

  async publish(versionOverride: string | undefined, performedByUserId: string) {
    return this.publishInternal(versionOverride, performedByUserId);
  }

  async schedulePublish(
    scheduledPublishAt: string,
    performedByUserId: string,
  ) {
    await this.ensureSeeded();
    const when = new Date(scheduledPublishAt);
    if (Number.isNaN(when.getTime())) {
      throw new BadRequestException('Invalid scheduled publish time.');
    }
    const minLeadMs = 60_000;
    if (when.getTime() < Date.now() + minLeadMs) {
      throw new BadRequestException(
        'Scheduled publish must be at least one minute in the future.',
      );
    }

    const row = await this.prisma.termsSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });
    const draft = this.resolveDraft(row);

    const updated = await this.prisma.termsSettings.update({
      where: { id: SINGLETON_ID },
      data: {
        scheduledPublishAt: when,
        scheduledByUserId: performedByUserId,
      },
      include: {
        scheduledBy: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    await this.appendAuditLog({
      action: TermsAuditAction.scheduled,
      version: draft.version,
      effectiveDateEn: draft.effectiveDateEn,
      effectiveDateBn: draft.effectiveDateBn,
      scheduledFor: when,
      performedByUserId,
    });

    return this.toAdminState(updated);
  }

  async cancelScheduledPublish(performedByUserId: string) {
    await this.ensureSeeded();
    const row = await this.prisma.termsSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });

    if (!row.scheduledPublishAt) {
      throw new BadRequestException('No scheduled publish is set.');
    }

    const draft = this.resolveDraft(row);

    const updated = await this.prisma.termsSettings.update({
      where: { id: SINGLETON_ID },
      data: {
        scheduledPublishAt: null,
        scheduledByUserId: null,
      },
      include: {
        scheduledBy: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    await this.appendAuditLog({
      action: TermsAuditAction.schedule_cancelled,
      version: draft.version,
      effectiveDateEn: draft.effectiveDateEn,
      effectiveDateBn: draft.effectiveDateBn,
      scheduledFor: row.scheduledPublishAt,
      performedByUserId,
    });

    return this.toAdminState(updated);
  }

  async discardDraft() {
    await this.ensureSeeded();
    const updated = await this.prisma.termsSettings.update({
      where: { id: SINGLETON_ID },
      data: {
        draftVersion: null,
        draftEffectiveDateEn: null,
        draftEffectiveDateBn: null,
        draftSectionsEn: Prisma.JsonNull,
        draftSectionsBn: Prisma.JsonNull,
      },
      include: {
        scheduledBy: {
          select: { id: true, email: true, phone: true },
        },
      },
    });
    return this.toAdminState(updated);
  }

  async processScheduledPublishIfDue() {
    await this.ensureSeeded();
    const row = await this.prisma.termsSettings.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (!row?.scheduledPublishAt || row.scheduledPublishAt.getTime() > Date.now()) {
      return;
    }

    await this.publishInternal(
      undefined,
      row.scheduledByUserId ?? undefined,
      row.scheduledPublishAt,
    );
  }

  private async publishInternal(
    versionOverride: string | undefined,
    performedByUserId?: string,
    scheduledFor?: Date,
  ) {
    await this.ensureSeeded();
    const row = await this.prisma.termsSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });

    const draft = this.resolveDraft(row);
    const nextVersion = (versionOverride ?? draft.version).trim();
    if (!nextVersion) {
      throw new BadRequestException('Terms version is required to publish.');
    }

    const sectionsEn = draft.sectionsEn;
    const sectionsBn = draft.sectionsBn;
    this.assertValidSections(sectionsEn, 'sectionsEn');
    this.assertValidSections(sectionsBn, 'sectionsBn');

    const now = new Date();
    const updated = await this.prisma.termsSettings.update({
      where: { id: SINGLETON_ID },
      data: {
        version: nextVersion,
        effectiveDateEn: draft.effectiveDateEn.trim(),
        effectiveDateBn: draft.effectiveDateBn.trim(),
        sectionsEn: sectionsEn as unknown as Prisma.InputJsonValue,
        sectionsBn: sectionsBn as unknown as Prisma.InputJsonValue,
        publishedAt: now,
        draftVersion: null,
        draftEffectiveDateEn: null,
        draftEffectiveDateBn: null,
        draftSectionsEn: Prisma.JsonNull,
        draftSectionsBn: Prisma.JsonNull,
        scheduledPublishAt: null,
        scheduledByUserId: null,
      },
    });

    await this.appendAuditLog({
      action: TermsAuditAction.published,
      version: updated.version,
      effectiveDateEn: updated.effectiveDateEn,
      effectiveDateBn: updated.effectiveDateBn,
      scheduledFor: scheduledFor ?? null,
      performedByUserId: performedByUserId ?? null,
    });

    this.cachedVersion = updated.version;

    return {
      published: true,
      version: updated.version,
      publishedAt: updated.publishedAt.toISOString(),
    };
  }

  private resolveDraft(row: {
    version: string;
    effectiveDateEn: string;
    effectiveDateBn: string;
    sectionsEn: Prisma.JsonValue;
    sectionsBn: Prisma.JsonValue;
    draftVersion: string | null;
    draftEffectiveDateEn: string | null;
    draftEffectiveDateBn: string | null;
    draftSectionsEn: Prisma.JsonValue | null;
    draftSectionsBn: Prisma.JsonValue | null;
  }) {
    return {
      version: row.draftVersion ?? row.version,
      effectiveDateEn: row.draftEffectiveDateEn ?? row.effectiveDateEn,
      effectiveDateBn: row.draftEffectiveDateBn ?? row.effectiveDateBn,
      sectionsEn: (row.draftSectionsEn ?? row.sectionsEn) as TermsSection[],
      sectionsBn: (row.draftSectionsBn ?? row.sectionsBn) as TermsSection[],
    };
  }

  private toAdminState(row: {
    version: string;
    effectiveDateEn: string;
    effectiveDateBn: string;
    sectionsEn: Prisma.JsonValue;
    sectionsBn: Prisma.JsonValue;
    publishedAt: Date;
    draftVersion: string | null;
    draftEffectiveDateEn: string | null;
    draftEffectiveDateBn: string | null;
    draftSectionsEn: Prisma.JsonValue | null;
    draftSectionsBn: Prisma.JsonValue | null;
    scheduledPublishAt: Date | null;
    scheduledBy: {
      id: string;
      email: string | null;
      phone: string | null;
    } | null;
  }): AdminTermsState {
    const draft = this.resolveDraft(row);
    const hasDraftChanges =
      row.draftVersion != null ||
      row.draftEffectiveDateEn != null ||
      row.draftEffectiveDateBn != null ||
      row.draftSectionsEn != null ||
      row.draftSectionsBn != null;

    return {
      published: {
        version: row.version,
        effectiveDateEn: row.effectiveDateEn,
        effectiveDateBn: row.effectiveDateBn,
        sectionsEn: row.sectionsEn as TermsSection[],
        sectionsBn: row.sectionsBn as TermsSection[],
        publishedAt: row.publishedAt.toISOString(),
      },
      draft,
      hasDraftChanges,
      schedule: row.scheduledPublishAt
        ? {
            scheduledPublishAt: row.scheduledPublishAt.toISOString(),
            scheduledBy: row.scheduledBy,
          }
        : null,
    };
  }

  private async appendAuditLog(data: {
    action: TermsAuditAction;
    version: string;
    effectiveDateEn?: string;
    effectiveDateBn?: string;
    scheduledFor?: Date | null;
    performedByUserId?: string | null;
  }) {
    await this.prisma.termsAuditLog.create({
      data: {
        action: data.action,
        version: data.version,
        effectiveDateEn: data.effectiveDateEn,
        effectiveDateBn: data.effectiveDateBn,
        scheduledFor: data.scheduledFor ?? undefined,
        performedById: data.performedByUserId ?? undefined,
      },
    });
  }

  private assertValidSections(sections: TermsSection[], field: string) {
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new BadRequestException(`${field} must be a non-empty array.`);
    }
    for (const section of sections) {
      if (!section?.id || !section?.title) {
        throw new BadRequestException(
          `${field} sections must each include id and title.`,
        );
      }
    }
  }
}
