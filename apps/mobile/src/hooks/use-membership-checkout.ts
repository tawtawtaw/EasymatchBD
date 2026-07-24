import { navigateToMembershipCheckout } from "../navigation/navigateMembershipCheckout";
import { useAuthStore } from "../store/authStore";
import { useMemberVerificationStore } from "../store/memberVerificationStore";
import { useMemberVerificationSnapshot } from "./use-member-verification-state";

function readVerifiedFromAuth() {
  const { session, user } = useAuthStore.getState();
  return (
    session?.isVerified ??
    user?.profile?.isVerified ??
    user?.isVerified ??
    false
  );
}

export function useMembershipCheckout() {
  const { verified } = useMemberVerificationSnapshot();
  const syncVerification = useMemberVerificationStore((s) => s.sync);

  async function openCheckout(): Promise<boolean> {
    await syncVerification(true);
    const isVerified =
      readVerifiedFromAuth() || useMemberVerificationStore.getState().mediaVerified;
    if (!isVerified) return false;
    return navigateToMembershipCheckout();
  }

  return { verified, openCheckout };
}
