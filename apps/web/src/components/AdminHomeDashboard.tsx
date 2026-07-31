"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getProfileEditorBootstrap } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import { useRequireStaffLanding } from "@/hooks/use-require-staff-home";
import { resolveStaffDisplayName } from "@/lib/staff-display";
import {
  handleStaffDashboardLoadError,
  shouldSignOutAfterStaffLoadError,
} from "@/lib/staff-dashboard-load-error";
import { AdminPaymentsRecentSection } from "@/components/AdminPaymentsRecentSection";

export function AdminHomeDashboard() {
  const router = useRouter();
  const t = useTranslations("adminHome");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const { authorized } = useRequireStaffLanding("admin");
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [completionPercent, setCompletionPercent] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted || !authorized) return;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const bootstrap = await getProfileEditorBootstrap(token!);
        if (cancelled) return;
        setDisplayName(resolveStaffDisplayName(bootstrap.profile));
        setCompletionPercent(bootstrap.completionPercent ?? 100);
      } catch (err) {
        if (cancelled) return;
        handleStaffDashboardLoadError(err, () => router.replace("/auth"));
        if (!shouldSignOutAfterStaffLoadError(err)) {
          setLoadError(
            err instanceof Error ? err.message : "Could not load dashboard.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mounted, authorized, router]);

  if (!mounted || !authorized || loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 text-sm font-semibold text-rose-800 hover:underline"
        >
          Try again
        </button>
      </main>
    );
  }

  if (!authToken) return null;

  const name = displayName?.trim() || t("fallbackName");

  const quickActions = [
    {
      href: "/admin",
      title: t("actions.portal"),
      desc: t("actions.portalDesc"),
      icon: "⚙️",
    },
    {
      href: "/admin",
      title: t("actions.dropdowns"),
      desc: t("actions.dropdownsDesc"),
      icon: "📋",
    },
    {
      href: "/admin",
      title: t("actions.privacy"),
      desc: t("actions.privacyDesc"),
      icon: "🔒",
    },
    {
      href: "/admin",
      title: t("actions.profiles"),
      desc: t("actions.profilesDesc"),
      icon: "👥",
    },
    {
      href: "/admin/payments",
      title: t("actions.payments"),
      desc: t("actions.paymentsDesc"),
      icon: "💰",
    },
    {
      href: "/admin",
      title: t("actions.tariffs"),
      desc: t("actions.tariffsDesc"),
      icon: "💳",
    },
    {
      href: "/verification",
      title: t("actions.verification"),
      desc: t("actions.verificationDesc"),
      icon: "✅",
    },
    {
      href: "/browse",
      title: t("actions.browse"),
      desc: t("actions.browseDesc"),
      icon: "🔍",
    },
    {
      href: "/admin/complaints",
      title: t("actions.complaints"),
      desc: t("actions.complaintsDesc"),
      icon: "⚠️",
    },
    {
      href: "/admin/consultant/cases",
      title: t("actions.consultantCases"),
      desc: t("actions.consultantCasesDesc"),
      icon: "💬",
    },
    {
      href: "/admin/audit-log",
      title: t("actions.auditLog"),
      desc: t("actions.auditLogDesc"),
      icon: "📜",
    },
    {
      href: "/profile",
      title: t("actions.profile"),
      desc: t("actions.profileDesc"),
      icon: "👤",
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(228,228,231,0.5),_transparent_55%),linear-gradient(to_bottom,_#fafafa,_#ffffff_40%)]">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
              {t("roleBadge")}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              {t("greeting", { name })}
            </h1>
            <p className="mt-2 max-w-2xl text-base text-zinc-600">{t("subtitle")}</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            {t("openPortal")} →
          </Link>
        </header>

        {completionPercent < 100 ? (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm text-amber-950">
              {t("completionHint", { percent: completionPercent })}
            </p>
            <Link
              href="/profile"
              className="mt-2 inline-flex text-sm font-semibold text-amber-900 hover:underline"
            >
              {t("completeProfile")} →
            </Link>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-lg font-bold text-zinc-900">{t("quickActionsTitle")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-400 hover:shadow-md"
              >
                <span className="text-2xl" aria-hidden>
                  {action.icon}
                </span>
                <h3 className="mt-3 font-semibold text-zinc-900 group-hover:text-zinc-700">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-600">{action.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {authToken ? <AdminPaymentsRecentSection token={authToken} /> : null}

        <section className="mt-12 rounded-2xl border border-zinc-200 bg-white/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("trustTitle")}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[t("trust.manage"), t("trust.privacy"), t("trust.support")].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm font-medium text-zinc-700"
              >
                <span className="text-zinc-900" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
