import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  calculateCompatibility,
  PrivacyLevel,
} from '@easymatch/shared';
import { MediaReviewStatus } from '@prisma/client';
import {
  buildVisibleProfileView,
  type PrivacyRule,
} from '../privacy/profile-privacy-filter';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionsService } from './connections.service';
import { DiscoveryService } from './discovery.service';
import { invalidateDiscoveryListCache } from './discovery-list-cache';
import { PrivacyFieldsService } from '../privacy/privacy-fields.service';

const discoveryListInclude = {
  user: { select: { id: true, phone: true } },
  photos: {
    where: { status: MediaReviewStatus.approved },
  },
  familyInfo: true,
  siblings: true,
  paternalRelatives: true,
  maternalRelatives: true,
  partnerPreference: true,
};

@Injectable()
export class SavedProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discovery: DiscoveryService,
    private readonly connections: ConnectionsService,
    private readonly privacyFields: PrivacyFieldsService,
  ) {}

  async getBookmarkedProfileIds(
    userId: string,
    profileIds: string[],
  ): Promise<Set<string>> {
    if (profileIds.length === 0) {
      return new Set();
    }

    const rows = await this.prisma.profileBookmark.findMany({
      where: { userId, profileId: { in: profileIds } },
      select: { profileId: true },
    });

    return new Set(rows.map((row) => row.profileId));
  }

  async saveBookmark(userId: string, profileIdOrCode: string) {
    const profile = await this.discovery.resolveBookmarkTarget(
      userId,
      profileIdOrCode,
    );

    if (profile.userId === userId) {
      throw new BadRequestException('You cannot bookmark your own profile');
    }

    const bookmark = await this.prisma.profileBookmark.upsert({
      where: {
        userId_profileId: { userId, profileId: profile.id },
      },
      create: { userId, profileId: profile.id },
      update: {},
    });

    this.discovery.invalidateProfileViewCache(userId, profileIdOrCode);
    invalidateDiscoveryListCache(userId);

    return {
      id: bookmark.id,
      profileId: bookmark.profileId,
      savedAt: bookmark.createdAt.toISOString(),
    };
  }

  async removeBookmark(userId: string, profileIdOrCode: string) {
    const profile = await this.discovery.resolveBookmarkTarget(
      userId,
      profileIdOrCode,
    );

    await this.prisma.profileBookmark.deleteMany({
      where: { userId, profileId: profile.id },
    });

    this.discovery.invalidateProfileViewCache(userId, profileIdOrCode);
    invalidateDiscoveryListCache(userId);

    return { removed: true, profileId: profile.id };
  }

  async listBookmarks(userId: string) {
    const bookmarks = await this.prisma.profileBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        profile: {
          include: discoveryListInclude,
        },
      },
    });

    const rules = await this.loadPrivacyRules();
    const viewerProfile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { partnerPreference: true },
    });

    const visibleBookmarks = bookmarks.filter((bookmark) =>
      bookmark.profile.userId !== userId,
    );

    const relationshipMap =
      await this.connections.batchGetListRelationshipSummaries(
        userId,
        visibleBookmarks.map((bookmark) => bookmark.profile.userId),
      );

    const items = [];

    for (const bookmark of visibleBookmarks) {
      const profile = bookmark.profile;
      const canView = await this.discovery.canViewerAccessProfile(
        userId,
        profile.userId,
      );
      if (!canView) {
        continue;
      }

      const relationship = relationshipMap.get(profile.userId) ?? {
        status: 'none' as const,
        viewerPrivacyLevel: PrivacyLevel.PUBLIC,
      };
      const view = buildVisibleProfileView(
        {
          ...profile,
          nidDocuments: [],
        },
        rules,
        relationship.viewerPrivacyLevel,
      );
      const compatibility = calculateCompatibility(
        viewerProfile?.partnerPreference,
        profile,
        {
          viewerGender: viewerProfile?.gender,
          viewerReligion: viewerProfile?.religion,
        },
      );

      items.push({
        bookmarkId: bookmark.id,
        savedAt: bookmark.createdAt.toISOString(),
        profileId: profile.id,
        profileCode: profile.profileCode,
        userId: profile.userId,
        viewerPrivacyLevel: relationship.viewerPrivacyLevel,
        relationshipStatus: relationship.status,
        personal: view.personal,
        media: view.media,
        hiddenFieldCount: view.hiddenFieldCount,
        compatibility,
        isBookmarked: true,
      });
    }

    return items;
  }

  private async loadPrivacyRules(): Promise<PrivacyRule[]> {
    const rows = await this.privacyFields.listAll();
    return rows.map((row) => ({
      fieldKey: row.fieldKey,
      isShareable: row.isShareable,
      minPrivacyLevel: row.minPrivacyLevel,
    }));
  }
}
