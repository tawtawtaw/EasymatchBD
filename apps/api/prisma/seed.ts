import { PrismaClient } from '@prisma/client';
import { DROPDOWN_SEED } from './dropdown-data';

const prisma = new PrismaClient();

async function main() {
  for (const group of DROPDOWN_SEED) {
    let order = 0;
    for (const option of group.options) {
      await prisma.dropdownOption.upsert({
        where: {
          category_value: { category: group.category, value: option.value },
        },
        create: {
          category: group.category,
          value: option.value,
          label: option.label,
          labelBn: option.labelBn,
          sortOrder: order++,
          isSystem: true,
        },
        update: {
          label: option.label,
          labelBn: option.labelBn,
          sortOrder: order - 1,
          isActive: true,
          isSystem: true,
        },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
