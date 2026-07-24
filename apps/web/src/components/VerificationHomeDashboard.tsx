"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getProfileEditorBootstrap } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMounted } from "@/hooks/use-mounted";
import { useRequireStaffLanding } from "@/hooks/use-require-staff-home";
import { resolveStaffDisplayName } from "@/lib/staff-display";
import { getVerificationQueue } from "@/lib/verification";

export function VerificationHomeDashboard() {
  const router = useRouter();
  const t = useTranslations("verificationHome");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const { authorized } = useRequireStaffLanding("verification");
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [completionPercent, setCompletionPercent] = useState(100);
  const [pendingCount, setPendingCount] = useState(0);

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
        const [bootstrap, queue] = await Promise.all([
          getProfileEditorBootstrap(token!),
          getVerificationQueue(token!),
        ]);
        if (cancelled) return;
        setDisplayName(resolveStaffDisplayName(bootstrap.profile));
        setCompletionPercent(bootstrap.completionPercent ?? 100);
        setPendingCount(queue.length);
      } catch {
        if (!cancelled) router.replace("/auth");
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

  if (!authToken) return null;

  const name = displayName?.trim() || t("fallbackName");

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(251,207,232,0.45),_transparent_55%),linear-gradient(to_bottom,_#fff1f2,_#ffffff_40%)]">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900">
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
            href="/verification"
            className="inline-flex rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-800"
          >
            {t("openPortal")} →
          </Link>
        </header>

        <section className="mt-10">
          <Link
            href="/verification"
            className="block rounded-2xl border border-zinc-200 border-l-4 border-l-rose-500 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-4xl font-bold text-zinc-900">{pendingCount}</p>
            <p className="mt-1 text-sm font-medium text-zinc-600">{t("stats.pending")}</p>
            <p className="mt-3 text-sm text-rose-800">{t("stats.pendingHint")} →</p>
          </Link>
        </section>

        {completionPercent < 100 ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
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
            {[
              {
                href: "/verification",
                title: t("actions.queue"),
                desc: t("actions.queueDesc"),
                icon: "📥",
              },
              {
                href: "/profile",
                title: t("actions.profile"),
                desc: t("actions.profileDesc"),
                icon: "👤",
              },
              {
                href: "/browse",
                title: t("actions.browse"),
                desc: t("actions.browseDesc"),
                icon: "🔍",
              },
            ].map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-rose-200 hover:shadow-md"
              >
                <span className="text-2xl" aria-hidden>
                  {action.icon}
                </span>
                <h3 className="mt-3 font-semibold text-zinc-900 group-hover:text-rose-900">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-600">{action.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-zinc-200 bg-white/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("trustTitle")}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[t("trust.review"), t("trust.documents"), t("trust.members")].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm font-medium text-zinc-700"
              >
                <span className="text-emerald-600" aria-hidden>
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
