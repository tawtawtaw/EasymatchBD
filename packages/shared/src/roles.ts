export const UserRole = {
  INDIVIDUAL: 'individual',
  PARENT_GUARDIAN: 'parent_guardian',
  PREMIUM_MEMBER: 'premium_member',
  MARRIAGE_CONSULTANT: 'marriage_consultant',
  SUPPORT_AGENT: 'support_agent',
  VERIFICATION_OFFICER: 'verification_officer',
  SUPER_ADMIN: 'super_admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const STAFF_ROLES = new Set<UserRole>([
  UserRole.MARRIAGE_CONSULTANT,
  UserRole.VERIFICATION_OFFICER,
  UserRole.SUPER_ADMIN,
]);

export function isStaffRole(role: string): role is UserRole {
  return STAFF_ROLES.has(role as UserRole);
}

export function isSuperAdminRole(role: string): boolean {
  return role === UserRole.SUPER_ADMIN;
}

export function isVerificationOfficerRole(role: string): boolean {
  return role === UserRole.VERIFICATION_OFFICER;
}

export function canAccessAdminProfiles(role: string): boolean {
  return isSuperAdminRole(role) || isVerificationOfficerRole(role);
}
