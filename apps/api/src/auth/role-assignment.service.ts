import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UserRole,
  isStaffRole,
  normalizeBangladeshPhone,
  normalizeEmail,
} from '@easymatch/shared';
import type { UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoleAssignmentService implements OnModuleInit {
  private superAdminPhones: string[] = [];
  private officerPhones: string[] = [];
  private consultantPhones: string[] = [];
  private superAdminEmails: string[] = [];
  private officerEmails: string[] = [];
  private consultantEmails: string[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.superAdminPhones = this.parsePhoneList('SUPER_ADMIN_PHONES');
    this.officerPhones = this.parsePhoneList('VERIFICATION_OFFICER_PHONES');
    this.consultantPhones = this.parsePhoneList('MARRIAGE_CONSULTANT_PHONES');
    this.superAdminEmails = this.parseEmailList('SUPER_ADMIN_EMAILS');
    this.officerEmails = this.parseEmailList('VERIFICATION_OFFICER_EMAILS');
    this.consultantEmails = this.parseEmailList('MARRIAGE_CONSULTANT_EMAILS');
  }

  resolveRoleForPhone(phone: string): PrismaUserRole | undefined {
    if (this.superAdminPhones.includes(phone)) {
      return UserRole.SUPER_ADMIN as PrismaUserRole;
    }
    if (this.officerPhones.includes(phone)) {
      return UserRole.VERIFICATION_OFFICER as PrismaUserRole;
    }
    if (this.consultantPhones.includes(phone)) {
      return UserRole.MARRIAGE_CONSULTANT as PrismaUserRole;
    }
    return undefined;
  }

  resolveRoleForEmail(email: string): PrismaUserRole | undefined {
    const normalized = normalizeEmail(email);
    if (this.superAdminEmails.includes(normalized)) {
      return UserRole.SUPER_ADMIN as PrismaUserRole;
    }
    if (this.officerEmails.includes(normalized)) {
      return UserRole.VERIFICATION_OFFICER as PrismaUserRole;
    }
    if (this.consultantEmails.includes(normalized)) {
      return UserRole.MARRIAGE_CONSULTANT as PrismaUserRole;
    }
    return undefined;
  }

  isAllowlistedStaffEmail(email: string): boolean {
    return Boolean(this.resolveRoleForEmail(email));
  }

  isAllowlistedStaffPhone(phone: string): boolean {
    const role = this.resolveRoleForPhone(phone);
    return role !== undefined && isStaffRole(role);
  }

  resolveRoleForUser(user: {
    phone: string | null;
    email: string | null;
    role: PrismaUserRole;
  }): PrismaUserRole {
    return (
      (user.phone ? this.resolveRoleForPhone(user.phone) : undefined) ??
      (user.email ? this.resolveRoleForEmail(user.email) : undefined) ??
      user.role
    );
  }

  async syncUserRole(userId: string): Promise<PrismaUserRole> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, email: true, role: true },
    });

    if (!user) {
      return 'individual';
    }

    return this.syncRoleForLoadedUser(user);
  }

  async syncRoleForLoadedUser(user: {
    id: string;
    phone: string | null;
    email: string | null;
    role: PrismaUserRole;
  }): Promise<PrismaUserRole> {
    const assignedRole =
      (user.phone ? this.resolveRoleForPhone(user.phone) : undefined) ??
      (user.email ? this.resolveRoleForEmail(user.email) : undefined);

    if (assignedRole && user.role !== assignedRole) {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: assignedRole },
        select: { role: true },
      });
      return updated.role;
    }

    return user.role;
  }

  private parsePhoneList(envKey: string): string[] {
    const raw = this.config.get<string>(envKey, '');
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => normalizeBangladeshPhone(value));
  }

  private parseEmailList(envKey: string): string[] {
    const raw = this.config.get<string>(envKey, '');
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => normalizeEmail(value));
  }
}
