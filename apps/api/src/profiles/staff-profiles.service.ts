import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStaffDto } from './dto/update-staff.dto';

const STAFF_COMPLETION_CHECKS = [
  'fullName',
  'email',
  'employeeId',
  'designation',
  'officeDivision',
  'officeDistrict',
] as const;

@Injectable()
export class StaffProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyStaffProfile(userId: string) {
    const profile = await this.ensureStaffProfile(userId);
    const completion = this.calculateCompletion(profile);

    return {
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      completionPercent: completion.completionPercent,
      completionMissing: completion.completionMissing,
    };
  }

  async getCompletionSummary(userId: string) {
    const profile = await this.ensureStaffProfile(userId);
    return this.calculateCompletion(profile);
  }

  async updateStaffProfile(userId: string, dto: UpdateStaffDto) {
    await this.ensureStaffProfile(userId);

    const updated = await this.prisma.staffProfile.update({
      where: { userId },
      data: {
        fullName: dto.fullName,
        email: dto.email,
        employeeId: dto.employeeId,
        designation: dto.designation,
        officeDivision: dto.officeDivision,
        officeDistrict: dto.officeDistrict,
        officeAddressLine: dto.officeAddressLine,
        notes: dto.notes,
      },
    });

    const completion = this.calculateCompletion(updated);

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      completionPercent: completion.completionPercent,
      completionMissing: completion.completionMissing,
    };
  }

  private async ensureStaffProfile(userId: string) {
    let profile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.staffProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  private calculateCompletion(profile: {
    fullName: string | null;
    email: string | null;
    employeeId: string | null;
    designation: string | null;
    officeDivision: string | null;
    officeDistrict: string | null;
  }) {
    const checks = STAFF_COMPLETION_CHECKS.map((key) => ({
      key,
      filled: this.isFilled(profile[key]),
    }));

    const filledCount = checks.filter((item) => item.filled).length;

    return {
      completionPercent: Math.round(
        (filledCount / STAFF_COMPLETION_CHECKS.length) * 100,
      ),
      completionMissing: checks
        .filter((item) => !item.filled)
        .map((item) => item.key),
    };
  }

  private isFilled(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
  }
}
