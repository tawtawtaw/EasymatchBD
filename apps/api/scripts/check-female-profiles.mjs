import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const females = await prisma.profile.findMany({
  where: { gender: 'female' },
  select: {
    profileCode: true,
    fullName: true,
    isVerified: true,
    profileBiodataReviewStatus: true,
    creationMode: true,
    user: { select: { isActive: true, phone: true } },
    photos: { select: { type: true, status: true } },
    nidDocuments: { select: { side: true, status: true, subject: true } },
    nidVerifiedAt: true,
    creatorNidVerifiedAt: true,
  },
  orderBy: { updatedAt: 'desc' },
});

const browseVisible = females.filter(
  (f) => f.isVerified && f.user.isActive,
);

console.log('Browse-visible females:', browseVisible.length);
console.log(
  browseVisible.map((f) => `${f.profileCode} ${f.fullName}`).join('\n'),
);

console.log('\nAll females:');
for (const f of females) {
  const browseOk = f.isVerified && f.user.isActive;
  console.log(
    JSON.stringify({
      code: f.profileCode,
      name: f.fullName,
      browseVisible: browseOk,
      isVerified: f.isVerified,
      biodata: f.profileBiodataReviewStatus,
      active: f.user.isActive,
      creationMode: f.creationMode,
      nidVerifiedAt: f.nidVerifiedAt,
      nidDocs: f.nidDocuments.map(
        (d) => `${d.subject}:${d.side}:${d.status}`,
      ),
    }),
  );
}

await prisma.$disconnect();
