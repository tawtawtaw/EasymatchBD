import { isPaidMember, PAID_MEMBERSHIP_REQUIRED_MESSAGE } from "@easymatch/shared";
import type { AuthSession, AuthUser } from "../services/auth";

export { isPaidMember, PAID_MEMBERSHIP_REQUIRED_MESSAGE };

export function membershipFromSession(
  session:
    | Pick<AuthSession, "isPaidMember" | "subscription">
    | Pick<AuthUser, "subscription">
    | null
    | undefined,
): boolean {
  if (!session) return false;
  if ("isPaidMember" in session && typeof session.isPaidMember === "boolean") {
    return session.isPaidMember;
  }
  return isPaidMember(session.subscription ?? null);
}

export function isPaidMembershipRequiredMessage(message: string): boolean {
  return message.includes(PAID_MEMBERSHIP_REQUIRED_MESSAGE);
}
