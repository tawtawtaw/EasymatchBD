"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { isStaffRole } from "@easymatch/shared";
import { useAuthSession } from "@/hooks/use-auth-session";
import { staffHomePath } from "@/lib/staff-routing";

export function useRequireMember() {
  const router = useRouter();
  const { user, ready, loggedIn } = useAuthSession();

  useEffect(() => {
    if (!ready) return;

    if (!loggedIn) {
      router.replace("/auth");
      return;
    }

    if (user && isStaffRole(user.role)) {
      router.replace(staffHomePath(user.role));
    }
  }, [ready, loggedIn, user, router]);

  const isMember =
    ready && loggedIn && user != null && !isStaffRole(user.role);

  return { ready, isMember };
}
