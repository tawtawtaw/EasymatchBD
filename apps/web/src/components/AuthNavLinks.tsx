"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { isStaffRole } from "@easymatch/shared";
import { signOut } from "@/lib/auth-session";
import { useAuthSession } from "@/hooks/use-auth-session";
import { staffHomePath } from "@/lib/staff-routing";
import { siteNavLinkClass, type SiteNavLayout } from "@/lib/site-nav-styles";

type AuthNavLinksProps = {
  layout?: SiteNavLayout;
  onNavigate?: () => void;
};

export function AuthNavLinks({ layout = "inline", onNavigate }: AuthNavLinksProps) {
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const router = useRouter();
  const { loggedIn, ready, user } = useAuthSession();
  const linkClass = siteNavLinkClass(layout);
  const buttonClass =
    layout === "stack"
      ? `${linkClass} w-full text-left`
      : linkClass;

  const profileHref =
    user && isStaffRole(user.role) ? staffHomePath(user.role) : "/profile";

  function handleSignOut() {
    signOut();
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (!ready) {
    if (layout === "stack") {
      return (
        <Link href="/auth" className={linkClass} onClick={onNavigate}>
          {tc("signIn")}
        </Link>
      );
    }
    return <span className="inline-block h-5 w-16" aria-hidden />;
  }

  if (loggedIn) {
    return (
      <>
        <Link href={profileHref} className={linkClass} onClick={onNavigate}>
          {user && isStaffRole(user.role) ? tc("admin") : tc("myProfile")}
        </Link>
        <button type="button" onClick={handleSignOut} className={buttonClass}>
          {ta("signOut")}
        </button>
      </>
    );
  }

  return (
    <Link href="/auth" className={linkClass} onClick={onNavigate}>
      {tc("signIn")}
    </Link>
  );
}
