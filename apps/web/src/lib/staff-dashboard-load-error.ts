import { signOut } from "@/lib/auth-session";

export function shouldSignOutAfterStaffLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("(401)") ||
    message.includes("unauthorized") ||
    message.includes("invalid or expired")
  );
}

export function handleStaffDashboardLoadError(
  error: unknown,
  redirectToAuth: () => void,
): void {
  if (shouldSignOutAfterStaffLoadError(error)) {
    signOut();
    redirectToAuth();
    return;
  }
}
