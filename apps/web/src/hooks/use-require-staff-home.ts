"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { isStaffRole, isSuperAdminRole } from "@easymatch/shared";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAuthToken } from "@/hooks/use-auth-token";
import { staffHomePath } from "@/lib/staff-routing";
import { isOfficerRole } from "@/lib/verification";

export type StaffLandingKind = "admin" | "verification";

export function useRequireStaffLanding(kind: StaffLandingKind) {
  const router = useRouter();
  const { user, ready, loggedIn } = useAuthSession();
  const authToken = useAuthToken();

  useEffect(() => {
    if (!ready) return;

    if (!loggedIn) {
      if (authToken) {
        return;
      }
      router.replace("/auth");
      return;
    }

    if (!user || !isStaffRole(user.role)) {
      router.replace("/auth");
      return;
    }

    const allowed =
      kind === "admin"
        ? isSuperAdminRole(user.role)
        : isOfficerRole(user.role);

    if (!allowed) {
      router.replace(staffHomePath(user.role));
    }
  }, [ready, loggedIn, authToken, user, router, kind]);

  const authorized =
    ready &&
    loggedIn &&
    user != null &&
    isStaffRole(user.role) &&
    (kind === "admin"
      ? isSuperAdminRole(user.role)
      : isOfficerRole(user.role));

  const sessionPending = ready && !loggedIn && Boolean(authToken);

  return { ready: ready && !sessionPending, authorized, user, sessionPending };
}
