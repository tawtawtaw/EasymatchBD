import { PrismaService } from '../prisma/prisma.service';

function randomProfileCode(): string {
  return String(Math.floor(10_000_000 + Math.random() * 90_000_000));
}

export async function generateUniqueProfileCode(
  prisma: PrismaService,
): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const profileCode = randomProfileCode();
    const existing = await prisma.profile.findUnique({
      where: { profileCode },
      select: { id: true },
    });
    if (!existing) return profileCode;
  }
  throw new Error('Could not generate a unique profile ID');
}
