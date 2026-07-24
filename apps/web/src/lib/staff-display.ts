export function resolveStaffDisplayName(
  profile: { fullName?: string | null } | null | undefined,
): string | null {
  const trimmed = profile?.fullName?.trim();
  return trimmed || null;
}
