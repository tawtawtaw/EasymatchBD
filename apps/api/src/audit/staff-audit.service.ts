import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { isStaffRole } from '@easymatch/shared';
import {
  Prisma,
  StaffActivityCategory,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import type { DiscoveryFilterInput } from '../discovery/discovery-filters';
import { PrismaService } from '../prisma/prisma.service';

export const STAFF_AUDIT_RETENTION_DAYS = 365;

export type StaffAuditLogInput = {
  actorId: string;
  actorRole: string;
  category: StaffActivityCategory;
  action: string;
  summary: string;
  httpMethod?: string;
  path?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class StaffAuditService implements OnModuleInit {
  private readonly logger = new Logger(StaffAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.purgeExpired().catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Staff audit purge skipped at startup (${message})`);
    });
  }

  private retentionDate(from = new Date()) {
    const expires = new Date(from);
    expires.setUTCDate(expires.getUTCDate() + STAFF_AUDIT_RETENTION_DAYS);
    return expires;
  }

  deriveCategory(path: string): StaffActivityCategory {
    const normalized = path.toLowerCase();
    if (
      normalized.includes('/admin/complaints') ||
      normalized.includes('/consultant/complaints') ||
      normalized.includes('/complaints')
    ) {
      return StaffActivityCategory.complaints;
    }
    if (normalized.includes('/verification')) {
      return StaffActivityCategory.verification;
    }
    if (normalized.includes('/consultant')) {
      return StaffActivityCategory.consultant;
    }
    return StaffActivityCategory.admin;
  }

  buildHttpSummary(method: string, path: string) {
    return `${method} ${path}`;
  }

  async purgeExpired() {
    const result = await this.prisma.staffActivityLog.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Purged ${result.count} expired staff activity log(s)`);
    }
    return result.count;
  }

  async log(input: StaffAuditLogInput) {
    if (!isStaffRole(input.actorRole)) {
      return null;
    }

    const now = new Date();
    try {
      return await this.prisma.staffActivityLog.create({
        data: {
          actorId: input.actorId,
          actorRole: input.actorRole as PrismaUserRole,
          category: input.category,
          action: input.action,
          summary: input.summary.slice(0, 500),
          httpMethod: input.httpMethod ?? null,
          path: input.path ?? null,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          metadata: input.metadata
            ? (input.metadata as Prisma.InputJsonValue)
            : undefined,
          expiresAt: this.retentionDate(now),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write staff activity log: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  async logHttpAction(
    actor: { id: string; role: string },
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: unknown,
  ) {
    const category = this.deriveCategory(path);
    const action = `http.${method.toLowerCase()}.${path.replace(/^\/api\/v1/, '').replace(/\//g, '.')}`;
    const entityId =
      params?.id ??
      params?.complaintId ??
      params?.engagementId ??
      params?.profileId ??
      params?.photoId ??
      params?.requestId ??
      undefined;

    const safeBody =
      body && typeof body === 'object'
        ? Object.fromEntries(
            Object.entries(body as Record<string, unknown>).filter(
              ([key]) =>
                !['password', 'token', 'otp', 'body'].includes(key.toLowerCase()),
            ),
          )
        : undefined;

    return this.log({
      actorId: actor.id,
      actorRole: actor.role,
      category,
      action: action.slice(0, 120),
      summary: this.buildHttpSummary(method, path),
      httpMethod: method,
      path,
      entityId,
      metadata: safeBody ? { params, body: safeBody } : params ? { params } : undefined,
    });
  }

  private summarizeDiscoveryFilters(filters: DiscoveryFilterInput): string {
    const parts = Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}=${String(value)}`);
    return parts.length > 0 ? parts.join(', ') : 'no filters';
  }

  async logBiodataCsvExport(
    actor: { id: string; role: string },
    filters: DiscoveryFilterInput,
    rowCount: number,
    truncated: boolean,
  ) {
    const filterSummary = this.summarizeDiscoveryFilters(filters);
    const truncatedNote = truncated ? ' (capped at max rows)' : '';
    return this.log({
      actorId: actor.id,
      actorRole: actor.role,
      category: StaffActivityCategory.admin,
      action: 'biodata.csv_export',
      summary: `Downloaded biodata CSV — ${rowCount} profile(s)${truncatedNote}; filters: ${filterSummary}`,
      httpMethod: 'GET',
      path: '/admin/profiles/export.csv',
      entityType: 'biodata_csv_export',
      metadata: { filters, rowCount, truncated },
    });
  }

  async logBiodataAuditExport(
    actor: { id: string; role: string },
    profileId: string,
    profileCode: string | null | undefined,
  ) {
    const profileRef = profileCode?.trim() || profileId;
    return this.log({
      actorId: actor.id,
      actorRole: actor.role,
      category: StaffActivityCategory.verification,
      action: 'biodata.audit_export',
      summary: `Downloaded audit biodata PDF for profile ${profileRef}`,
      httpMethod: 'GET',
      path: `/verification/profiles/${profileId}/biodata-export`,
      entityType: 'profile',
      entityId: profileId,
      metadata: { profileCode: profileCode ?? null, exportFormat: 'audit_pdf' },
    });
  }

  async listForAdmin(options?: {
    category?: StaffActivityCategory;
    actorId?: string;
    limit?: number;
    cursor?: string;
  }) {
    await this.purgeExpired();

    const take = Math.min(Math.max(options?.limit ?? 50, 1), 200);
    const rows = await this.prisma.staffActivityLog.findMany({
      where: {
        ...(options?.category ? { category: options.category } : {}),
        ...(options?.actorId ? { actorId: options.actorId } : {}),
        ...(options?.cursor
          ? { createdAt: { lt: new Date(options.cursor) } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: {
          select: {
            email: true,
            phone: true,
            role: true,
            profile: { select: { fullName: true } },
            staffProfile: { select: { fullName: true } },
          },
        },
      },
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actorRole: row.actorRole,
        actorName:
          row.actor.staffProfile?.fullName ??
          row.actor.profile?.fullName ??
          row.actor.email ??
          row.actor.phone ??
          null,
        category: row.category,
        action: row.action,
        summary: row.summary,
        httpMethod: row.httpMethod,
        path: row.path,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
      })),
      nextCursor:
        rows.length === take
          ? rows[rows.length - 1]?.createdAt.toISOString()
          : null,
    };
  }
}
