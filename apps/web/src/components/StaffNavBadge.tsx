"use client";

import { isSuperAdminRole } from "@easymatch/shared";
import { siteNavLinkClass, type SiteNavLayout } from "@/lib/site-nav-styles";

export function NavCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="inline-flex min-w-[1rem] items-center justify-center rounded-full bg-rose-800 px-1 text-[10px] font-bold leading-4 text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function adminNavBadgeCount(
  role: string,
  summary: {
    deletionRequestsPending: number;
    complaintsUnassigned: number;
    consultantCasesQueued: number;
  },
) {
  if (!isSuperAdminRole(role)) return 0;
  return (
    summary.deletionRequestsPending +
    summary.complaintsUnassigned +
    summary.consultantCasesQueued
  );
}

export function consultantNavBadgeCount(summary: {
  complaintsUnassigned: number;
  consultantCasesQueued: number;
}) {
  return summary.complaintsUnassigned + summary.consultantCasesQueued;
}

export function navLinkWithBadgeClass(layout: SiteNavLayout) {
  return layout === "stack"
    ? `${siteNavLinkClass("stack")} relative inline-flex items-center gap-2`
    : "relative inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-800 hover:text-rose-800";
}
