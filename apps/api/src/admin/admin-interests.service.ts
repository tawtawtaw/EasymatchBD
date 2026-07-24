import { Injectable } from '@nestjs/common';
import { InterestStatus, Prisma } from '@prisma/client';
import {
  isValidProfileCode,
  normalizeProfileCode,
  PrivacyLevel,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';

export type AdminInterestFilter = 'all' | 'pending' | 'connected' | 'declined';

export type AdminInterestsQuery = {
  page?: number;
  limit?: number;
  q?: string;
  filter?: AdminInterestFilter;
};

const userWithProfileSelect = {
  id: true,
  phone: true,
  profile: {
    select: {
      id: true,
      profileCode: true,
      fullName: true,
      gender: true,
      currentDistrict: true,
      isVerified: true,
    },
  },
} satisfies Prisma.UserSelect;

type UserWithProfile = Prisma.UserGetPayload<{
  select: typeof userWithProfileSelect;
}>;

@Injectable()
export class AdminInterestsService {
  constructor(private readonly prisma: PrismaService) {}

  async listRelationships(query: AdminInterestsQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const filter = query.filter ?? 'all';
    const search = query.q?.trim().toLowerCase();

    const pairKeys = await this.collectPairKeys();
    const hydrated = await this.hydratePairs([...pairKeys]);

    let rows = hydrated;

    if (filter !== 'all') {
      rows = rows.filter((row) => this.matchesFilter(row, filter));
    }

    if (search) {
      rows = rows.filter((row) => this.matchesSearch(row, search));
    }

    rows.sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime(),
    );

    const total = rows.length;
    const skip = (page - 1) * limit;
    const items = rows.slice(skip, skip + limit).map((row) => ({
      ...row,
      relationshipLevel: row.connection?.privacyLevel ?? PrivacyLevel.PUBLIC,
    }));

    const summary = this.buildSummary(hydrated);

    return { items, total, page, limit, summary };
  }

  private buildSummary(
    rows: Awaited<ReturnType<AdminInterestsService['hydratePairs']>>,
  ) {
    const summary = {
      level0: 0,
      level1: 0,
      level2: 0,
      level3: 0,
      pending: 0,
      declined: 0,
      pendingUpgrade: 0,
    };

    for (const row of rows) {
      if (row.connection) {
        switch (row.connection.privacyLevel) {
          case 1:
            summary.level1 += 1;
            break;
          case 2:
            summary.level2 += 1;
            break;
          case 3:
            summary.level3 += 1;
            break;
          default:
            summary.level0 += 1;
            break;
        }
        if (row.connection.pendingUpgradeLevel != null) {
          summary.pendingUpgrade += 1;
        }
      } else {
        summary.level0 += 1;
        const hasPending =
          row.interestAtoB?.status === InterestStatus.pending ||
          row.interestBtoA?.status === InterestStatus.pending;
        const hasDeclined =
          row.interestAtoB?.status === InterestStatus.declined ||
          row.interestBtoA?.status === InterestStatus.declined;
        if (hasPending) summary.pending += 1;
        if (hasDeclined) summary.declined += 1;
      }
    }

    return summary;
  }

  private canonicalPair(userAId: string, userBId: string): [string, string] {
    return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  }

  private pairKey(userAId: string, userBId: string): string {
    const [low, high] = this.canonicalPair(userAId, userBId);
    return `${low}:${high}`;
  }

  private async collectPairKeys(): Promise<Set<string>> {
    const [interests, connections] = await Promise.all([
      this.prisma.interest.findMany({
        select: { senderId: true, receiverId: true },
      }),
      this.prisma.connection.findMany({
        select: { userLowId: true, userHighId: true },
      }),
    ]);

    const keys = new Set<string>();
    for (const interest of interests) {
      keys.add(this.pairKey(interest.senderId, interest.receiverId));
    }
    for (const connection of connections) {
      keys.add(`${connection.userLowId}:${connection.userHighId}`);
    }
    return keys;
  }

  private async hydratePairs(pairKeys: string[]) {
    if (pairKeys.length === 0) {
      return [];
    }

    const pairs = pairKeys.map((key) => {
      const [userLowId, userHighId] = key.split(':');
      return { userLowId, userHighId };
    });

    const interestOr: Prisma.InterestWhereInput[] = pairs.flatMap(
      ({ userLowId, userHighId }) => [
        { senderId: userLowId, receiverId: userHighId },
        { senderId: userHighId, receiverId: userLowId },
      ],
    );

    const connectionOr: Prisma.ConnectionWhereInput[] = pairs.map(
      ({ userLowId, userHighId }) => ({
        userLowId,
        userHighId,
      }),
    );

    const [interests, connections] = await Promise.all([
      this.prisma.interest.findMany({
        where: { OR: interestOr },
        include: {
          sender: { select: userWithProfileSelect },
          receiver: { select: userWithProfileSelect },
        },
      }),
      this.prisma.connection.findMany({
        where: { OR: connectionOr },
        include: {
          userLow: { select: userWithProfileSelect },
          userHigh: { select: userWithProfileSelect },
        },
      }),
    ]);

    const upgradeByIds = [
      ...new Set(
        connections
          .map((c) => c.pendingUpgradeById)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const upgradeByUsers =
      upgradeByIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: upgradeByIds } },
            select: {
              id: true,
              profile: { select: { fullName: true } },
              staffProfile: { select: { fullName: true } },
            },
          })
        : [];

    const upgradeByName = new Map(
      upgradeByUsers.map((user) => [
        user.id,
        user.profile?.fullName ?? user.staffProfile?.fullName ?? null,
      ]),
    );

    const interestByPair = new Map<string, typeof interests>();
    for (const interest of interests) {
      const key = this.pairKey(interest.senderId, interest.receiverId);
      const list = interestByPair.get(key) ?? [];
      list.push(interest);
      interestByPair.set(key, list);
    }

    const connectionByPair = new Map(
      connections.map((c) => [`${c.userLowId}:${c.userHighId}`, c]),
    );

    return pairs.map(({ userLowId, userHighId }) => {
      const key = `${userLowId}:${userHighId}`;
      const pairInterests = interestByPair.get(key) ?? [];
      const connection = connectionByPair.get(key) ?? null;

      const lowUser =
        connection?.userLow ??
        pairInterests.find((i) => i.senderId === userLowId)?.sender ??
        pairInterests.find((i) => i.receiverId === userLowId)?.receiver;

      const highUser =
        connection?.userHigh ??
        pairInterests.find((i) => i.senderId === userHighId)?.sender ??
        pairInterests.find((i) => i.receiverId === userHighId)?.receiver;

      const interestAtoB =
        pairInterests.find(
          (i) => i.senderId === userLowId && i.receiverId === userHighId,
        ) ?? null;
      const interestBtoA =
        pairInterests.find(
          (i) => i.senderId === userHighId && i.receiverId === userLowId,
        ) ?? null;

      const activityDates = [
        interestAtoB?.respondedAt,
        interestAtoB?.createdAt,
        interestBtoA?.respondedAt,
        interestBtoA?.createdAt,
        connection?.updatedAt,
      ].filter((d): d is Date => d instanceof Date);

      const lastActivityAt =
        activityDates.length > 0
          ? new Date(
              Math.max(...activityDates.map((d) => d.getTime())),
            ).toISOString()
          : new Date().toISOString();

      return {
        memberA: this.toMember(lowUser!),
        memberB: this.toMember(highUser!),
        interestAtoB: interestAtoB ? this.toInterestLeg(interestAtoB) : null,
        interestBtoA: interestBtoA ? this.toInterestLeg(interestBtoA) : null,
        connection: connection
          ? {
              id: connection.id,
              privacyLevel: connection.privacyLevel,
              pendingUpgradeLevel: connection.pendingUpgradeLevel,
              pendingUpgradeByUserId: connection.pendingUpgradeById,
              pendingUpgradeByName: connection.pendingUpgradeById
                ? (upgradeByName.get(connection.pendingUpgradeById) ?? null)
                : null,
              updatedAt: connection.updatedAt.toISOString(),
            }
          : null,
        lastActivityAt,
      };
    });
  }

  private toMember(user: UserWithProfile) {
    return {
      userId: user.id,
      profileId: user.profile?.id ?? null,
      profileCode: user.profile?.profileCode ?? null,
      fullName: user.profile?.fullName ?? null,
      gender: user.profile?.gender ?? null,
      currentDistrict: user.profile?.currentDistrict ?? null,
      phone: user.phone,
      isVerified: user.profile?.isVerified ?? false,
    };
  }

  private toInterestLeg(interest: {
    id: string;
    status: InterestStatus;
    createdAt: Date;
    respondedAt: Date | null;
  }) {
    return {
      id: interest.id,
      status: interest.status,
      createdAt: interest.createdAt.toISOString(),
      respondedAt: interest.respondedAt?.toISOString() ?? null,
    };
  }

  private matchesFilter(
    row: Awaited<ReturnType<AdminInterestsService['hydratePairs']>>[number],
    filter: AdminInterestFilter,
  ): boolean {
    const hasConnection = row.connection != null;
    const hasPending =
      row.interestAtoB?.status === InterestStatus.pending ||
      row.interestBtoA?.status === InterestStatus.pending;
    const hasDeclined =
      row.interestAtoB?.status === InterestStatus.declined ||
      row.interestBtoA?.status === InterestStatus.declined;

    switch (filter) {
      case 'connected':
        return hasConnection;
      case 'pending':
        return hasPending && !hasConnection;
      case 'declined':
        return hasDeclined && !hasConnection;
      default:
        return true;
    }
  }

  private matchesSearch(
    row: Awaited<ReturnType<AdminInterestsService['hydratePairs']>>[number],
    term: string,
  ): boolean {
    const members = [row.memberA, row.memberB];
    const normalizedCode = isValidProfileCode(term)
      ? normalizeProfileCode(term)
      : null;

    return members.some((member) => {
      if (member.fullName?.toLowerCase().includes(term)) return true;
      if (member.phone?.includes(term)) return true;
      if (
        normalizedCode &&
        member.profileCode &&
        member.profileCode === normalizedCode
      ) {
        return true;
      }
      if (member.profileCode?.includes(term)) return true;
      return false;
    });
  }
}
