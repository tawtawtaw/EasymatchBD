import {
  isSuperAdminRole,
  isVerificationOfficerRole,
  UserRole,
} from "@easymatch/shared";

export function staffHomePath(role: string): string {
  if (isSuperAdminRole(role)) return "/admin/home";
  if (isVerificationOfficerRole(role)) return "/verification/home";
  if (role === UserRole.MARRIAGE_CONSULTANT) return "/consultant/home";
  return "/profile";
}