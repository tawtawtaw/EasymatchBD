import { UserRole } from "@easymatch/shared";

export function isMarriageConsultantRole(role: string) {
  return role === UserRole.MARRIAGE_CONSULTANT;
}
