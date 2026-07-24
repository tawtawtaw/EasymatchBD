import { useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../store/authStore";
import {
  useMemberVerificationStore,
} from "../store/memberVerificationStore";

export { clearMemberVerificationMediaCache } from "../store/memberVerificationStore";

export function useMemberVerificationSnapshot() {
  const authVerified = useAuthStore(
    (s) =>
      s.session?.isVerified ??
      s.user?.profile?.isVerified ??
      s.user?.isVerified ??
      false,
  );
  const mediaVerified = useMemberVerificationStore((s) => s.mediaVerified);
  const awaitingOfficer = useMemberVerificationStore((s) => s.awaitingOfficer);
  const loading = useMemberVerificationStore((s) => s.loading);
  const verified = authVerified || mediaVerified;

  return {
    verified,
    awaitingOfficer,
    needsVerificationAction: !verified && !awaitingOfficer,
    loading: !verified && loading,
  };
}

export function useMemberVerificationState(options?: {
  refreshOnFocus?: boolean;
  refreshOnMount?: boolean;
}) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const sync = useMemberVerificationStore((s) => s.sync);
  const snapshot = useMemberVerificationSnapshot();

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      if (options?.refreshOnFocus === false) return;
      if (snapshot.verified) return;
      void sync(true);
    }, [options?.refreshOnFocus, snapshot.verified, sync, userId]),
  );

  useEffect(() => {
    if (!userId || !options?.refreshOnMount) return;
    void sync(true);
  }, [options?.refreshOnMount, sync, userId]);

  return {
    ...snapshot,
    refresh: () => sync(true),
  };
}

export function useEnsureMemberVerificationSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const sync = useMemberVerificationStore((s) => s.sync);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void sync(false);
    }, [sync, userId]),
  );
}
