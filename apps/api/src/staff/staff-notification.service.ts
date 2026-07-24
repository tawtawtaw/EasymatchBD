import { Injectable, Logger } from '@nestjs/common';
import {
  StaffNotificationType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

@Injectable()
export class StaffNotificationService {
  private readonly logger = new Logger(StaffNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async notifyVerificationSubmission(input: {
    profileId: string;
    profileCode: string;
    detail: string;
  }) {
    if (await this.isDuplicate(StaffNotificationType.verification_submission, input.profileId)) {
      return;
    }

    const title = 'New verification submission';
    const body = `Profile ${input.profileCode} needs review (${input.detail}).`;
    const linkPath = '/verification';

    await this.createBroadcast({
      type: StaffNotificationType.verification_submission,
      audienceRole: UserRole.verification_officer,
      title,
      body,
      linkPath,
      entityId: input.profileId,
      emailSubject: title,
      emailRoles: [UserRole.verification_officer, UserRole.super_admin],
      sendEmail: false,
    });
  }

  async notifyComplaintSubmitted(input: {
    complaintId: string;
    targetProfileCode: string;
    category: string;
  }) {
    const title = 'New member complaint';
    const body = `Complaint filed against profile ${input.targetProfileCode} (${input.category}).`;
    const linkPath = '/consultant/complaints';

    await this.createBroadcast({
      type: StaffNotificationType.complaint_submitted,
      audienceRole: UserRole.marriage_consultant,
      title,
      body,
      linkPath,
      entityId: input.complaintId,
      emailSubject: title,
      emailRoles: [UserRole.marriage_consultant, UserRole.super_admin],
      sendEmail: true,
    });
  }

  async notifyConsultantCaseQueued(input: {
    engagementId: string;
    serviceLabel: string;
  }) {
    const title = 'New consultant case';
    const body = `Paid case queued: ${input.serviceLabel}.`;
    const linkPath = '/consultant/home';

    await this.createBroadcast({
      type: StaffNotificationType.consultant_case_queued,
      audienceRole: UserRole.marriage_consultant,
      title,
      body,
      linkPath,
      entityId: input.engagementId,
      emailSubject: title,
      emailRoles: [UserRole.marriage_consultant, UserRole.super_admin],
      sendEmail: true,
    });
  }

  async notifyProfileDeletionRequest(input: {
    requestId: string;
    targetLabel: string;
  }) {
    const title = 'Profile deletion request';
    const body = `Deletion review needed for ${input.targetLabel}.`;
    const linkPath = '/admin/home';

    await this.createBroadcast({
      type: StaffNotificationType.profile_deletion_request,
      audienceRole: UserRole.super_admin,
      title,
      body,
      linkPath,
      entityId: input.requestId,
      emailSubject: title,
      emailRoles: [UserRole.super_admin],
      sendEmail: true,
    });
  }

  async notifyComplaintAssigned(input: {
    consultantId: string;
    complaintId: string;
    targetProfileCode: string;
  }) {
    const title = 'Complaint assigned to you';
    const body = `You were assigned complaint for profile ${input.targetProfileCode}.`;
    const linkPath = `/consultant/complaints/${input.complaintId}`;

    await this.createTargeted({
      type: StaffNotificationType.complaint_assigned,
      audienceRole: UserRole.marriage_consultant,
      targetUserId: input.consultantId,
      title,
      body,
      linkPath,
      entityId: input.complaintId,
      emailUserIds: [input.consultantId],
      emailSubject: title,
    });
  }

  private async isDuplicate(type: StaffNotificationType, entityId: string) {
    const recent = await this.prisma.staffNotification.findFirst({
      where: {
        type,
        entityId,
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
      select: { id: true },
    });
    return Boolean(recent);
  }

  private async createBroadcast(input: {
    type: StaffNotificationType;
    audienceRole: UserRole;
    title: string;
    body: string;
    linkPath: string;
    entityId: string;
    emailSubject: string;
    emailRoles: UserRole[];
    sendEmail: boolean;
  }) {
    await this.prisma.staffNotification.create({
      data: {
        type: input.type,
        audienceRole: input.audienceRole,
        title: input.title,
        body: input.body,
        linkPath: input.linkPath,
        entityId: input.entityId,
      },
    });

    if (!input.sendEmail) {
      return;
    }

    void this.sendRoleEmail(input.emailRoles, {
      subject: input.emailSubject,
      body: input.body,
      linkPath: input.linkPath,
    });
  }

  private async createTargeted(input: {
    type: StaffNotificationType;
    audienceRole: UserRole;
    targetUserId: string;
    title: string;
    body: string;
    linkPath: string;
    entityId: string;
    emailUserIds: string[];
    emailSubject: string;
  }) {
    await this.prisma.staffNotification.create({
      data: {
        type: input.type,
        audienceRole: input.audienceRole,
        targetUserId: input.targetUserId,
        title: input.title,
        body: input.body,
        linkPath: input.linkPath,
        entityId: input.entityId,
      },
    });

    void this.sendUserEmail(input.emailUserIds, {
      subject: input.emailSubject,
      body: input.body,
      linkPath: input.linkPath,
    });
  }

  private async sendRoleEmail(
    roles: UserRole[],
    message: { subject: string; body: string; linkPath: string },
  ) {
    try {
      const users = await this.prisma.user.findMany({
        where: { role: { in: roles }, isActive: true },
        select: {
          email: true,
          staffProfile: { select: { email: true } },
        },
      });

      const recipients = users
        .map((user) => user.staffProfile?.email?.trim() || user.email?.trim() || '')
        .filter(Boolean);

      await this.email.send({
        to: recipients,
        subject: message.subject,
        text: `${message.body}\n\nOpen: ${this.email.buildStaffLink(message.linkPath)}`,
      });
    } catch (error) {
      this.logger.warn(`Staff role email failed: ${String(error)}`);
    }
  }

  private async sendUserEmail(
    userIds: string[],
    message: { subject: string; body: string; linkPath: string },
  ) {
    try {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true },
        select: {
          email: true,
          staffProfile: { select: { email: true } },
        },
      });

      const recipients = users
        .map((user) => user.staffProfile?.email?.trim() || user.email?.trim() || '')
        .filter(Boolean);

      await this.email.send({
        to: recipients,
        subject: message.subject,
        text: `${message.body}\n\nOpen: ${this.email.buildStaffLink(message.linkPath)}`,
      });
    } catch (error) {
      this.logger.warn(`Staff user email failed: ${String(error)}`);
    }
  }
}
