import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsultantServiceType, Prisma } from '@prisma/client';
import {
  CONSULTANT_SERVICE_TYPES,
  ConsultantServiceType as SharedConsultantServiceType,
} from '@easymatch/shared';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TARIFFS: {
  serviceType: ConsultantServiceType;
  labelEn: string;
  labelBn: string;
  priceBdt: Prisma.Decimal;
  sortOrder: number;
  descriptionEn: string;
  descriptionBn: string;
}[] = [
  {
    serviceType: ConsultantServiceType.profile_assessment,
    labelEn: 'Profile assessment',
    labelBn: 'প্রোফাইল মূল্যায়ন',
    priceBdt: new Prisma.Decimal(999),
    sortOrder: 1,
    descriptionEn:
      'Consultant review of both profiles with written feedback for the connection.',
    descriptionBn:
      'সংযোগের উভয় প্রোফাইল পরামর্শদাতার পর্যালোচনা ও লিখিত মতামত।',
  },
  {
    serviceType: ConsultantServiceType.compatibility_guidance,
    labelEn: 'Compatibility guidance',
    labelBn: 'সামঞ্জস্যতা নির্দেশনা',
    priceBdt: new Prisma.Decimal(1499),
    sortOrder: 2,
    descriptionEn:
      'Expert interpretation of the comparison matrix and partner expectations.',
    descriptionBn: 'তুলনা ম্যাট্রিক্স ও পার্টনার প্রত্যাশার বিশেষজ্ঞ ব্যাখ্যা।',
  },
  {
    serviceType: ConsultantServiceType.family_mediation,
    labelEn: 'Family mediation',
    labelBn: 'পারিবারিক মধ্যস্থতা',
    priceBdt: new Prisma.Decimal(2499),
    sortOrder: 3,
    descriptionEn:
      'Facilitated discussion when families or expectations need alignment.',
    descriptionBn: 'পরিবার বা প্রত্যাশা সামঞ্জস্য করতে সহায়তা করা আলোচনা।',
  },
  {
    serviceType: ConsultantServiceType.meeting_coordination,
    labelEn: 'Meeting coordination',
    labelBn: 'মিটিং সমন্বয়',
    priceBdt: new Prisma.Decimal(799),
    sortOrder: 4,
    descriptionEn:
      'Schedule and coordinate consultant or facilitated member meetings.',
    descriptionBn: 'পরামর্শদাতা বা সদস্য মিটিং নির্ধারণ ও সমন্বয়।',
  },
  {
    serviceType: ConsultantServiceType.marriage_planning,
    labelEn: 'Marriage planning assistance',
    labelBn: 'বিবাহ পরিকল্পনা সহায়তা',
    priceBdt: new Prisma.Decimal(1999),
    sortOrder: 5,
    descriptionEn:
      'Checklist and timeline support for nikah and family introduction steps.',
    descriptionBn: 'নিকাহ ও পারিবারিক পরিচয়ের জন্য চেকলিস্ট ও সময়রেখা সহায়তা।',
  },
];

export type ConsultantTariffUpdate = {
  serviceType: string;
  labelEn: string;
  labelBn?: string | null;
  priceBdt: number;
  currency?: string;
  isActive: boolean;
  sortOrder: number;
  descriptionEn?: string | null;
  descriptionBn?: string | null;
};

@Injectable()
export class ConsultantTariffsService {
  private syncChecked = false;
  private activeTariffsCache: {
    expiresAt: number;
    value: Array<{
      id: string;
      serviceType: ConsultantServiceType;
      labelEn: string;
      labelBn: string | null;
      priceBdt: string;
      currency: string;
      isActive: boolean;
      sortOrder: number;
      descriptionEn: string | null;
      descriptionBn: string | null;
      updatedAt: string;
    }>;
  } | null = null;
  private static readonly ACTIVE_TARIFFS_CACHE_TTL_MS = 300_000;

  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    await this.ensureTariffsSynced();
    const rows = await this.prisma.consultantTariff.findMany({
      orderBy: [{ sortOrder: 'asc' }, { serviceType: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async listActive() {
    await this.ensureTariffsSynced();
    if (
      this.activeTariffsCache &&
      this.activeTariffsCache.expiresAt > Date.now()
    ) {
      return this.activeTariffsCache.value;
    }

    const rows = await this.prisma.consultantTariff.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { serviceType: 'asc' }],
    });
    const value = rows.map((row) => this.toDto(row));
    this.activeTariffsCache = {
      expiresAt: Date.now() + ConsultantTariffsService.ACTIVE_TARIFFS_CACHE_TTL_MS,
      value,
    };
    return value;
  }

  async getByServiceType(serviceType: string) {
    await this.ensureTariffsSynced();
    const normalized = this.assertServiceType(serviceType);
    const row = await this.prisma.consultantTariff.findUnique({
      where: { serviceType: normalized },
    });
    if (!row) {
      throw new NotFoundException(
        `Consultant tariff not found for service: ${serviceType}`,
      );
    }
    return this.toDto(row);
  }

  async bulkUpdate(updates: ConsultantTariffUpdate[]) {
    await this.ensureTariffsSynced();

    for (const update of updates) {
      const serviceType = this.assertServiceType(update.serviceType);
      if (update.priceBdt < 0) {
        throw new BadRequestException(
          `Price must be zero or positive for ${serviceType}`,
        );
      }

      const existing = await this.prisma.consultantTariff.findUnique({
        where: { serviceType },
      });
      if (!existing) {
        throw new NotFoundException(
          `Consultant tariff not found for service: ${serviceType}`,
        );
      }

      await this.prisma.consultantTariff.update({
        where: { serviceType },
        data: {
          labelEn: update.labelEn.trim(),
          labelBn: update.labelBn?.trim() || null,
          priceBdt: new Prisma.Decimal(update.priceBdt),
          currency: update.currency?.trim() || 'BDT',
          isActive: update.isActive,
          sortOrder: update.sortOrder,
          descriptionEn: update.descriptionEn?.trim() || null,
          descriptionBn: update.descriptionBn?.trim() || null,
        },
      });
    }

    this.clearActiveTariffsCache();
    return this.listAll();
  }

  clearActiveTariffsCache() {
    this.activeTariffsCache = null;
  }

  private assertServiceType(serviceType: string): ConsultantServiceType {
    if (
      !CONSULTANT_SERVICE_TYPES.includes(
        serviceType as SharedConsultantServiceType,
      )
    ) {
      throw new BadRequestException(
        `Unknown consultant service type: ${serviceType}`,
      );
    }
    return serviceType as ConsultantServiceType;
  }

  private async ensureTariffsSynced() {
    if (this.syncChecked) {
      return;
    }

    const existingCount = await this.prisma.consultantTariff.count();
    if (existingCount >= DEFAULT_TARIFFS.length) {
      this.syncChecked = true;
      return;
    }

    await Promise.all(
      DEFAULT_TARIFFS.map((tariff) =>
        this.prisma.consultantTariff.upsert({
          where: { serviceType: tariff.serviceType },
          create: tariff,
          update: {},
        }),
      ),
    );

    this.syncChecked = true;
  }

  private toDto(row: {
    id: string;
    serviceType: ConsultantServiceType;
    labelEn: string;
    labelBn: string | null;
    priceBdt: Prisma.Decimal;
    currency: string;
    isActive: boolean;
    sortOrder: number;
    descriptionEn: string | null;
    descriptionBn: string | null;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      serviceType: row.serviceType,
      labelEn: row.labelEn,
      labelBn: row.labelBn,
      priceBdt: row.priceBdt.toFixed(2),
      currency: row.currency,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      descriptionEn: row.descriptionEn,
      descriptionBn: row.descriptionBn,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
