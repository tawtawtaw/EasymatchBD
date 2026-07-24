import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DropdownCategory } from '@easymatch/shared';
import { DISTRICT_SEED } from '../../prisma/district-data';
import { UPAZILA_SEED } from '../../prisma/upazila-data';
import { DROPDOWN_SEED } from '../../prisma/dropdown-data';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const DROPDOWN_CACHE_PREFIX = 'dropdowns:public:';
const DROPDOWN_CACHE_TTL_SECONDS = 86_400;
const DROPDOWN_CACHE_LOCALES = ['en', 'bn'] as const;
const SEED_FAST_PATH_MIN_COUNT = 80;
const REDIS_LOOKUP_TIMEOUT_MS = 300;

const ISLAM_DROPDOWN_CATEGORIES = [
  DropdownCategory.HAS_BEARD,
  DropdownCategory.PRAYER_PRACTICE,
  DropdownCategory.IS_ALIVE,
  DropdownCategory.BEARD_PREFERENCE,
  DropdownCategory.PRAYER_PREFERENCE,
  DropdownCategory.HIJAB_PRACTICE,
  DropdownCategory.HIJAB_PREFERENCE,
] as const;

const MARITAL_DROPDOWN_CATEGORIES = [
  DropdownCategory.EXPECTED_MARRIAGE_TIMELINE,
  DropdownCategory.DOWRY_EXPECTATION,
  DropdownCategory.WEDDING_CEREMONY_PREFERENCE,
  DropdownCategory.EXPECTED_PARENTHOOD_TIMELINE,
  DropdownCategory.LIVING_ARRANGEMENTS_MALE,
  DropdownCategory.LIVING_ARRANGEMENTS_FEMALE,
] as const;

type DropdownItem = {
  value: string;
  label: string;
  parentValue: string | null;
};

type DropdownMap = Record<string, DropdownItem[]>;

@Injectable()
export class DropdownsService implements OnModuleInit {
  private readonly logger = new Logger(DropdownsService.name);
  private seedsEnsured = false;
  private seedsEnsuring: Promise<void> | null = null;
  private readonly cache = new Map<string, DropdownMap>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    void this.warmup().catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Dropdown warmup failed (${message})`);
    });
  }

  private async warmup() {
    await this.ensureSeedsOnce();
    await Promise.all(
      DROPDOWN_CACHE_LOCALES.map((locale) => this.getCachedDropdownMap(locale)),
    );
    this.logger.log('Dropdown cache warmed');
  }

  async getPublicDropdowns(category?: string, locale = 'en') {
    await this.ensureSeedsOnce();

    if (category) {
      const all = await this.getCachedDropdownMap(locale);
      return all[category] ?? [];
    }

    return this.getCachedDropdownMap(locale);
  }

  private async getCachedDropdownMap(locale: string): Promise<DropdownMap> {
    const memoryCached = this.cache.get(locale);
    if (memoryCached) {
      return memoryCached;
    }

    const redisKey = `${DROPDOWN_CACHE_PREFIX}${locale}`;
    const redisCached = await this.tryRedisLookup<DropdownMap>(redisKey);
    if (redisCached) {
      this.cache.set(locale, redisCached);
      return redisCached;
    }

    const map = await this.loadDropdownMapFromDb(locale);
    this.cache.set(locale, map);
    void this.redis
      .setJson(redisKey, map, DROPDOWN_CACHE_TTL_SECONDS)
      .catch(() => undefined);

    return map;
  }

  private async loadDropdownMapFromDb(locale: string): Promise<DropdownMap> {
    const options = await this.prisma.dropdownOption.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    return options.reduce<DropdownMap>((acc, opt) => {
      if (!acc[opt.category]) acc[opt.category] = [];
      acc[opt.category].push({
        value: opt.value,
        label: locale === 'bn' && opt.labelBn ? opt.labelBn : opt.label,
        parentValue: opt.parentValue,
      });
      return acc;
    }, {});
  }

  private async tryRedisLookup<T>(key: string): Promise<T | null> {
    try {
      return await Promise.race([
        this.redis.getJson<T>(key),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), REDIS_LOOKUP_TIMEOUT_MS);
        }),
      ]);
    } catch {
      return null;
    }
  }

  private invalidateCache() {
    this.cache.clear();
    void this.redis
      .delMany(
        DROPDOWN_CACHE_LOCALES.map((locale) => `${DROPDOWN_CACHE_PREFIX}${locale}`),
      )
      .catch(() => undefined);
  }

  listCategories() {
    return Object.values(DropdownCategory).map((category) => ({
      category,
    }));
  }

  async listAllForAdmin(category?: string) {
    await this.ensureSeedsOnce();

    return this.prisma.dropdownOption.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createOption(data: {
    category: string;
    value: string;
    label: string;
    labelBn?: string;
    sortOrder?: number;
  }) {
    this.assertKnownCategory(data.category);
    const value = this.normalizeValue(data.value);

    const sortOrder =
      data.sortOrder ??
      (await this.prisma.dropdownOption.count({
        where: { category: data.category },
      }));

    try {
      const created = await this.prisma.dropdownOption.create({
        data: {
          category: data.category,
          value,
          label: data.label,
          labelBn: data.labelBn,
          sortOrder,
          isSystem: false,
        },
      });
      this.invalidateCache();
      return created;
    } catch {
      throw new ConflictException(
        'An option with this category and value already exists',
      );
    }
  }

  async updateOption(
    id: string,
    data: {
      label?: string;
      labelBn?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.dropdownOption.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Dropdown option not found');
    }

    const updated = await this.prisma.dropdownOption.update({
      where: { id },
      data: {
        label: data.label,
        labelBn: data.labelBn,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
    this.invalidateCache();
    return updated;
  }

  async deleteOption(id: string) {
    const existing = await this.prisma.dropdownOption.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Dropdown option not found');
    }
    if (existing.isSystem) {
      throw new BadRequestException(
        'System dropdown options cannot be deleted. Deactivate instead.',
      );
    }

    await this.prisma.dropdownOption.delete({ where: { id } });
    this.invalidateCache();
    return { deleted: true };
  }

  private async ensureSeedsOnce() {
    if (this.seedsEnsured) return;
    if (this.seedsEnsuring) {
      await this.seedsEnsuring;
      return;
    }

    this.seedsEnsuring = this.runSeedChecks();
    try {
      await this.seedsEnsuring;
    } finally {
      this.seedsEnsuring = null;
    }
  }

  private async runSeedChecks() {
    await this.ensureEducationMediumSeed();
    await this.ensureEducationSubjectSeed();
    await this.ensureUpazilaSeed();
    await this.ensureMaritalInformationDropdowns();
    await this.ensureIslamProfileDropdowns();

    const count = await this.prisma.dropdownOption.count();
    if (count >= SEED_FAST_PATH_MIN_COUNT) {
      this.seedsEnsured = true;
      return;
    }

    await this.ensureInitialSeed();
    await this.ensureDistrictSeed();
    await this.ensureMarriedStatusOption();
    this.seedsEnsured = true;
  }

  private async ensureInitialSeed() {
    const count = await this.prisma.dropdownOption.count();
    if (count > 0) return;

    const rows = DROPDOWN_SEED.flatMap((group) =>
      group.options.map((option, index) => ({
        category: group.category,
        value: option.value,
        label: option.label,
        labelBn: option.labelBn,
        sortOrder: index,
        isSystem: true,
      })),
    );

    await this.prisma.dropdownOption.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  private async ensureEducationMediumSeed() {
    const group = DROPDOWN_SEED.find(
      (entry) => entry.category === DropdownCategory.EDUCATION_MEDIUM,
    );
    if (!group) return;

    const existing = await this.prisma.dropdownOption.findMany({
      where: { category: DropdownCategory.EDUCATION_MEDIUM },
      select: { value: true, sortOrder: true },
    });
    const existingKeys = new Set(existing.map((row) => row.value));
    let nextSortOrder = Math.max(...existing.map((row) => row.sortOrder), -1);

    const missing = group.options
      .filter((option) => !existingKeys.has(option.value))
      .map((option) => {
        nextSortOrder += 1;
        return {
          category: DropdownCategory.EDUCATION_MEDIUM,
          value: option.value,
          label: option.label,
          labelBn: option.labelBn,
          sortOrder: nextSortOrder,
          isSystem: true,
        };
      });

    if (missing.length === 0) return;

    await this.prisma.dropdownOption.createMany({
      data: missing,
      skipDuplicates: true,
    });
    this.invalidateCache();
  }

  private async ensureEducationSubjectSeed() {
    const group = DROPDOWN_SEED.find(
      (entry) => entry.category === DropdownCategory.EDUCATION_SUBJECT,
    );
    if (!group) return;

    const existing = await this.prisma.dropdownOption.findMany({
      where: { category: DropdownCategory.EDUCATION_SUBJECT },
      select: { value: true, sortOrder: true },
    });
    const existingKeys = new Set(existing.map((row) => row.value));
    let nextSortOrder = Math.max(...existing.map((row) => row.sortOrder), -1);

    const missing = group.options
      .filter((option) => !existingKeys.has(option.value))
      .map((option) => {
        nextSortOrder += 1;
        return {
          category: DropdownCategory.EDUCATION_SUBJECT,
          value: option.value,
          label: option.label,
          labelBn: option.labelBn,
          sortOrder: nextSortOrder,
          isSystem: true,
        };
      });

    if (missing.length === 0) return;

    await this.prisma.dropdownOption.createMany({
      data: missing,
      skipDuplicates: true,
    });
    this.invalidateCache();
  }

  private async ensureMarriedStatusOption() {
    const existing = await this.prisma.dropdownOption.findUnique({
      where: {
        category_value: {
          category: DropdownCategory.MARITAL_STATUS,
          value: 'married',
        },
      },
    });
    if (existing) return;

    const neverMarried = await this.prisma.dropdownOption.findFirst({
      where: {
        category: DropdownCategory.MARITAL_STATUS,
        value: 'never_married',
      },
    });
    if (!neverMarried) return;

    await this.prisma.dropdownOption.create({
      data: {
        category: DropdownCategory.MARITAL_STATUS,
        value: 'married',
        label: 'Married',
        labelBn: 'বিবাহিত',
        sortOrder: neverMarried.sortOrder + 1,
        isSystem: true,
      },
    });
  }

  private async ensureDistrictSeed() {
    const count = await this.prisma.dropdownOption.count({
      where: { category: DropdownCategory.DISTRICT },
    });
    if (count > 0) return;

    await this.prisma.dropdownOption.createMany({
      data: DISTRICT_SEED.map((district, index) => ({
        category: DropdownCategory.DISTRICT,
        value: district.value,
        label: district.label,
        labelBn: district.labelBn,
        parentValue: district.parentValue,
        sortOrder: index,
        isSystem: true,
      })),
      skipDuplicates: true,
    });
  }

  private async ensureUpazilaSeed() {
    const count = await this.prisma.dropdownOption.count({
      where: { category: DropdownCategory.UPAZILA },
    });
    if (count >= UPAZILA_SEED.length) return;

    const existing = await this.prisma.dropdownOption.findMany({
      where: { category: DropdownCategory.UPAZILA },
      select: { value: true, sortOrder: true },
    });
    const existingKeys = new Set(existing.map((row) => row.value));
    let nextSortOrder = Math.max(...existing.map((row) => row.sortOrder), -1);

    const missing = UPAZILA_SEED.filter(
      (option) => !existingKeys.has(option.value),
    ).map((option) => {
      nextSortOrder += 1;
      return {
        category: DropdownCategory.UPAZILA,
        value: option.value,
        label: option.label,
        labelBn: option.labelBn,
        parentValue: option.parentValue,
        sortOrder: nextSortOrder,
        isSystem: true,
      };
    });

    if (missing.length === 0) return;

    await this.prisma.dropdownOption.createMany({
      data: missing,
      skipDuplicates: true,
    });
    this.invalidateCache();
  }

  private async ensureIslamProfileDropdowns() {
    const groups = DROPDOWN_SEED.filter((entry) =>
      ISLAM_DROPDOWN_CATEGORIES.includes(
        entry.category as (typeof ISLAM_DROPDOWN_CATEGORIES)[number],
      ),
    );

    const existing = await this.prisma.dropdownOption.findMany({
      where: { category: { in: [...ISLAM_DROPDOWN_CATEGORIES] } },
      select: { category: true, value: true, sortOrder: true },
    });

    const existingKeys = new Set(
      existing.map((row) => `${row.category}:${row.value}`),
    );
    const sortOrderByCategory = existing.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.category] = Math.max(acc[row.category] ?? -1, row.sortOrder);
        return acc;
      },
      {},
    );

    const missing = groups.flatMap((group) =>
      group.options
        .filter(
          (option) => !existingKeys.has(`${group.category}:${option.value}`),
        )
        .map((option) => {
          const nextSortOrder = (sortOrderByCategory[group.category] ?? -1) + 1;
          sortOrderByCategory[group.category] = nextSortOrder;
          return {
            category: group.category,
            value: option.value,
            label: option.label,
            labelBn: option.labelBn,
            sortOrder: nextSortOrder,
            isSystem: true,
          };
        }),
    );

    if (missing.length === 0) return;

    await this.prisma.dropdownOption.createMany({
      data: missing,
      skipDuplicates: true,
    });
    this.invalidateCache();
  }

  private async ensureMaritalInformationDropdowns() {
    const groups = DROPDOWN_SEED.filter((entry) =>
      MARITAL_DROPDOWN_CATEGORIES.includes(
        entry.category as (typeof MARITAL_DROPDOWN_CATEGORIES)[number],
      ),
    );

    const existing = await this.prisma.dropdownOption.findMany({
      where: { category: { in: [...MARITAL_DROPDOWN_CATEGORIES] } },
      select: { category: true, value: true, sortOrder: true },
    });

    const existingKeys = new Set(
      existing.map((row) => `${row.category}:${row.value}`),
    );
    const sortOrderByCategory = existing.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.category] = Math.max(acc[row.category] ?? -1, row.sortOrder);
        return acc;
      },
      {},
    );

    const missing = groups.flatMap((group) =>
      group.options
        .filter(
          (option) => !existingKeys.has(`${group.category}:${option.value}`),
        )
        .map((option) => {
          const nextSortOrder = (sortOrderByCategory[group.category] ?? -1) + 1;
          sortOrderByCategory[group.category] = nextSortOrder;
          return {
            category: group.category,
            value: option.value,
            label: option.label,
            labelBn: option.labelBn,
            sortOrder: nextSortOrder,
            isSystem: true,
          };
        }),
    );

    if (missing.length === 0) return;

    await this.prisma.dropdownOption.createMany({
      data: missing,
      skipDuplicates: true,
    });
    this.invalidateCache();
  }

  private assertKnownCategory(category: string) {
    if (!Object.values(DropdownCategory).includes(category as never)) {
      throw new BadRequestException(`Unknown dropdown category: ${category}`);
    }
  }

  private normalizeValue(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    if (!normalized) {
      throw new BadRequestException('Value is required');
    }
    return normalized;
  }
}
