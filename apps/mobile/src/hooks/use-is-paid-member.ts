import { membershipFromSession } from "../lib/membership";
import { useAuthStore } from "../store/authStore";

export function useIsPaidMember(): boolean {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  return membershipFromSession(session ?? user);
}
