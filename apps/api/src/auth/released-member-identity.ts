import type { Prisma } from '@prisma/client';

/** Clears login identifiers so the phone/email can register as a new member. */
export const RELEASED_MEMBER_IDENTITY: Prisma.UserUpdateInput = {
  phone: null,
  email: null,
  phoneVerifiedAt: null,
  emailVerifiedAt: null,
  passwordHash: null,
};
