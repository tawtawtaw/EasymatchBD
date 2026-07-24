"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { isStaffRole, isSuperAdminRole } from "@easymatch/shared";
import { useAuthSession } from "@/hooks/use-auth-session";
import { staffHomePath } from "@/lib/staff-routing";
import { isOfficerRole } from "@/lib/verification";

export type StaffLandingKind = "admin" | "verification";

export function useRequireStaffLanding(kind: StaffLandingKind) {
  const router = useRouter();
  const { user, ready, loggedIn } = useAuthSession();

  useEffect(() => {
    if (!ready) return;

    if (!loggedIn) {
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
  }, [ready, loggedIn, user, router, kind]);

  const authorized =
    ready &&
    loggedIn &&
    user != null &&
    isStaffRole(user.role) &&
    (kind === "admin"
      ? isSuperAdminRole(user.role)
      : isOfficerRole(user.role));

  return { ready, authorized, user };
}
