"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BrowseNavLink } from "@/components/BrowseNavLink";
import { AdminNavLink } from "@/components/AdminNavLink";
import { AuthNavLinks } from "@/components/AuthNavLinks";
import { ConnectionsNavLink } from "@/components/ConnectionsNavLink";
import { DiscoveryNavLink } from "@/components/DiscoveryNavLink";
import { FeatureCommandTrigger } from "@/components/FeatureCommandPalette";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MembershipNavLink } from "@/components/MembershipNavLink";
import { ComplaintsNavLink } from "@/components/ComplaintsNavLink";
import { MessagesNavLink } from "@/components/MessagesNavLink";
import { VerificationNavLink } from "@/components/VerificationNavLink";
import { ConsultantNavLink } from "@/components/ConsultantNavLink";
import { StaffNotificationBell } from "@/components/StaffNotificationBell";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMounted } from "@/hooks/use-mounted";
import { isStaffRole } from "@easymatch/shared";
import type { SiteNavLayout } from "@/lib/site-nav-styles";

type SiteHeaderClientProps = {
  brand: string;
};

function HeaderNavItems({
  layout,
  onNavigate,
}: {
  layout: SiteNavLayout;
  onNavigate?: () => void;
}) {
  const { loggedIn, user, ready } = useAuthSession();

  return (
    <>
      {ready && loggedIn && user && !isStaffRole(user.role) ? (
        <FeatureCommandTrigger layout={layout} />
      ) : null}
      <AuthNavLinks layout={layout} onNavigate={onNavigate} />
      <BrowseNavLink layout={layout} onNavigate={onNavigate} />
      <DiscoveryNavLink layout={layout} onNavigate={onNavigate} />
      <ConnectionsNavLink layout={layout} onNavigate={onNavigate} />
      <MembershipNavLink layout={layout} onNavigate={onNavigate} />
      <ComplaintsNavLink layout={layout} onNavigate={onNavigate} />
      <MessagesNavLink layout={layout} onNavigate={onNavigate} />
      <VerificationNavLink layout={layout} onNavigate={onNavigate} />
      <ConsultantNavLink layout={layout} onNavigate={onNavigate} />
      <AdminNavLink layout={layout} onNavigate={onNavigate} />
    </>
  );
}

function readHeaderBottom() {
  const header = document.getElementById("site-header");
  return header ? header.getBoundingClientRect().bottom : 56;
}

export function SiteHeaderClient({ brand }: SiteHeaderClientProps) {
  const t = useTranslations("common");
  const mounted = useMounted();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(56);
  const { loggedIn, user, ready } = useAuthSession();
  const homeHref = "/";

  useEffect(() => {
    const header = document.getElementById("site-header");
    if (!header) return;
    header.classList.toggle("z-[202]", menuOpen);
    return () => {
      header.classList.remove("z-[202]");
    };
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function syncMenuTop() {
      setMenuTop(readHeaderBottom());
    }

    syncMenuTop();
    window.addEventListener("resize", syncMenuTop);
    window.addEventListener("scroll", syncMenuTop, { passive: true });
    return () => {
      window.removeEventListener("resize", syncMenuTop);
      window.removeEventListener("scroll", syncMenuTop);
    };
  }, [menuOpen]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 640) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const mobileMenu =
    menuOpen && mounted
      ? createPortal(
          <>
            <button
              type="button"
              aria-label={t("closeMenu")}
              className="fixed inset-0 z-[200] bg-black/30 sm:hidden"
              onClick={closeMenu}
            />
            <nav
              id="mobile-site-nav"
              className="fixed inset-x-0 z-[201] max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-zinc-200 bg-white px-4 py-3 shadow-xl sm:hidden"
              style={{ top: menuTop }}
            >
              <div className="mx-auto flex max-w-5xl flex-col gap-0.5">
                <HeaderNavItems layout="stack" onNavigate={closeMenu} />
              </div>
            </nav>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="flex w-full min-w-0 items-center justify-between gap-2">
        <Link href={homeHref} className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/home/brand/logo-embd.jpg"
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
          <span className="truncate text-lg font-bold text-rose-800">{brand}</span>
        </Link>

        <div className="hidden items-center gap-2 sm:flex sm:gap-3">
          <HeaderNavItems layout="inline" />
          <StaffNotificationBell />
          <LanguageSwitcher />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:hidden">
          <StaffNotificationBell />
          <LanguageSwitcher />
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-site-nav"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-lg text-zinc-700 shadow-sm"
          >
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </div>
      {mobileMenu}
    </>
  );
}
