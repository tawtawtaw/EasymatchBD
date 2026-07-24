import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { MemberComplaintStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MemberComplaintsService } from './member-complaints.service';

@Injectable()
export class ComplaintWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly complaints: MemberComplaintsService,
  ) {}

  private isConsultantRole(role: string) {
    return role === UserRole.MARRIAGE_CONSULTANT || role === UserRole.SUPER_ADMIN;
  }

  private async assertComplaintAccess(
    userId: string,
    role: string,
    complaintId: string,
  ) {
    const complaint = await this.prisma.memberComplaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    if (this.isConsultantRole(role)) {
      if (
        role !== UserRole.SUPER_ADMIN &&
        complaint.assignedConsultantId !== userId
      ) {
        throw new ForbiddenException('Assign yourself to this complaint first');
      }
      return complaint;
    }

    if (complaint.reporterId !== userId) {
      throw new ForbiddenException('Not allowed to access this complaint');
    }
    return complaint;
  }

  async listMessages(userId: string, role: string, complaintId: string) {
    await this.assertComplaintAccess(userId, role, complaintId);

    const rows = await this.prisma.memberComplaintMessage.findMany({
      where: {
        complaintId,
        ...(this.isConsultantRole(role) ? {} : { isPrivate: false }),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            role: true,
            profile: { select: { fullName: true } },
            staffProfile: { select: { fullName: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      complaintId: row.complaintId,
      senderId: row.senderId,
      body: row.body,
      isPrivate: row.isPrivate,
      createdAt: row.createdAt.toISOString(),
      senderName:
        row.sender.staffProfile?.fullName ??
        row.sender.profile?.fullName ??
        null,
      senderIsConsultant: this.isConsultantRole(row.sender.role),
    }));
  }

  async sendMessage(
    userId: string,
    role: string,
    complaintId: string,
    body: string,
    isPrivate?: boolean,
  ) {
    const complaint = await this.assertComplaintAccess(userId, role, complaintId);

    if (
      complaint.status === MemberComplaintStatus.resolved ||
      complaint.status === MemberComplaintStatus.dismissed ||
      complaint.status === MemberComplaintStatus.cancelled
    ) {
      throw new BadRequestException('This complaint is closed');
    }

    if (isPrivate && !this.isConsultantRole(role)) {
      throw new ForbiddenException('Only consultants can send private notes');
    }

    const row = await this.prisma.memberComplaintMessage.create({
      data: {
        complaintId,
        senderId: userId,
        body: body.trim(),
        isPrivate: Boolean(isPrivate),
      },
      include: {
        sender: {
          select: {
            role: true,
            profile: { select: { fullName: true } },
            staffProfile: { select: { fullName: true } },
          },
        },
      },
    });

    return {
      id: row.id,
      complaintId: row.complaintId,
      senderId: row.senderId,
      body: row.body,
      isPrivate: row.isPrivate,
      createdAt: row.createdAt.toISOString(),
      senderName:
        row.sender.staffProfile?.fullName ??
        row.sender.profile?.fullName ??
        null,
      senderIsConsultant: this.isConsultantRole(row.sender.role),
    };
  }

  async listDiary(userId: string, role: string, complaintId: string) {
    this.complaints.assertConsultantRole(role);
    await this.assertComplaintAccess(userId, role, complaintId);

    const rows = await this.prisma.memberComplaintDiaryEntry.findMany({
      where: { complaintId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            staffProfile: { select: { fullName: true } },
            profile: { select: { fullName: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      complaintId: row.complaintId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      authorName:
        row.author.staffProfile?.fullName ??
        row.author.profile?.fullName ??
        null,
    }));
  }

  async createDiaryEntry(
    userId: string,
    role: string,
    complaintId: string,
    body: string,
  ) {
    this.complaints.assertConsultantRole(role);
    await this.assertComplaintAccess(userId, role, complaintId);

    const row = await this.prisma.memberComplaintDiaryEntry.create({
      data: {
        complaintId,
        authorId: userId,
        body: body.trim(),
      },
    });

    return {
      id: row.id,
      complaintId: row.complaintId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      authorName: null,
    };
  }

  async updateDiaryEntry(
    userId: string,
    role: string,
    complaintId: string,
    entryId: string,
    body: string,
  ) {
    this.complaints.assertConsultantRole(role);
    await this.assertComplaintAccess(userId, role, complaintId);

    const entry = await this.prisma.memberComplaintDiaryEntry.findFirst({
      where: { id: entryId, complaintId, authorId: userId },
    });
    if (!entry) {
      throw new NotFoundException('Diary entry not found');
    }

    const updated = await this.prisma.memberComplaintDiaryEntry.update({
      where: { id: entryId },
      data: { body: body.trim() },
    });

    return {
      id: updated.id,
      complaintId: updated.complaintId,
      authorId: updated.authorId,
      body: updated.body,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      authorName: null,
    };
  }

  async deleteDiaryEntry(
    userId: string,
    role: string,
    complaintId: string,
    entryId: string,
  ) {
    this.complaints.assertConsultantRole(role);
    await this.assertComplaintAccess(userId, role, complaintId);

    const entry = await this.prisma.memberComplaintDiaryEntry.findFirst({
      where: { id: entryId, complaintId, authorId: userId },
    });
    if (!entry) {
      throw new NotFoundException('Diary entry not found');
    }

    await this.prisma.memberComplaintDiaryEntry.delete({
      where: { id: entryId },
    });
    return { deleted: true };
  }
}
