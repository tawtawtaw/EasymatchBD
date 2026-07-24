"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { DiscoveryProfileCard } from "@/components/DiscoveryProfileCard";
import {
  FeatureCommandTrigger,
} from "@/components/FeatureCommandPalette";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { getMemberHomeBootstrap, listSavedProfiles, type SavedProfileItem } from "@/lib/discovery";
import { invalidateMemberDiscoveryCaches } from "@/lib/member-alerts";
import { membershipFromSession } from "@/lib/membership";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAuthToken } from "@/hooks/use-auth-token";
import { useMemberDiscoveryStats } from "@/hooks/use-member-discovery-stats";
import { useMounted } from "@/hooks/use-mounted";
import { useRequireMember } from "@/hooks/use-require-member";

const WELCOME_SEEN_KEY = "easymatch_verified_welcome_seen";

export function MemberHomeDashboard() {
  const router = useRouter();
  const t = useTranslations("memberHome");
  const tm = useTranslations("membership");
  const tc = useTranslations("common");
  const mounted = useMounted();
  const authToken = useAuthToken();
  const { user: session } = useAuthSession();
  const { isMember } = useRequireMember();
  const isPaid = membershipFromSession(session);
  const { stats: liveStats } = useMemberDiscoveryStats();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string | null>(null);
  const [profileCode, setProfileCode] = useState<string | null>(null);
  const [completionPercent, setCompletionPercent] = useState(100);
  const [suggestions, setSuggestions] = useState<
    Awaited<ReturnType<typeof getMemberHomeBootstrap>>["suggestions"]
  >([]);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfileItem[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        invalidateMemberDiscoveryCaches();
        const [data, saved] = await Promise.all([
          getMemberHomeBootstrap(token!),
          listSavedProfiles(token!).catch(() => [] as SavedProfileItem[]),
        ]);
        if (cancelled) return;

        if (!data.termsAccepted) {
          router.replace("/profile");
          return;
        }

        if (!data.profile.isVerified) {
          router.replace("/discovery");
          return;
        }

        setFullName(data.profile.fullName);
        setProfileCode(data.profile.profileCode);
        setCompletionPercent(data.profile.completionPercent ?? 100);
        setSuggestions(data.suggestions);
        setSavedProfiles(saved);

        if (!localStorage.getItem(WELCOME_SEEN_KEY)) {
          setShowWelcome(true);
          localStorage.setItem(WELCOME_SEEN_KEY, "1");
        }
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
  }, [mounted, router]);

  if (!mounted || !isMember || loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{tc("loading")}</p>
      </main>
    );
  }

  if (!authToken) return null;

  const displayName = fullName?.trim() || t("fallbackName");
  const stats = liveStats;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(251,207,232,0.45),_transparent_55%),linear-gradient(to_bottom,_#fff1f2,_#ffffff_40%)]">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {showWelcome ? (
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  {t("welcomeBanner.kicker")}
                </p>
                <h2 className="mt-1 text-xl font-bold text-zinc-900">
                  {t("welcomeBanner.title")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                  {t("welcomeBanner.body")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWelcome(false)}
                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
              >
                {t("welcomeBanner.dismiss")}
              </button>
            </div>
          </div>
        ) : null}

        <header className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span aria-hidden>✓</span>
              {t("verifiedBadge")}
            </span>
            {profileCode ? (
              <span className="text-sm text-zinc-500">
                {t("profileCode", { code: profileCode })}
              </span>
            ) : null}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              {t("greeting", { name: displayName })}
            </h1>
            <p className="mt-2 max-w-2xl text-base text-zinc-600">{t("subtitle")}</p>
            {!isPaid ? (
              <div className="mt-4 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p>{tm("homeUpsell")}</p>
                <Link
                  href="/membership"
                  className="mt-2 inline-flex font-semibold text-amber-900 hover:underline"
                >
                  {tm("viewPlans")} →
                </Link>
              </div>
            ) : null}
          </div>
          <FeatureCommandTrigger variant="hero" />
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: t("stats.incoming"),
              value: stats.incoming,
              href: "/connections?tab=incoming",
              accent: "border-l-rose-500",
            },
            {
              label: t("stats.outgoing"),
              value: stats.outgoing,
              href: "/connections?tab=outgoing",
              accent: "border-l-amber-500",
            },
            {
              label: t("stats.connections"),
              value: stats.connections,
              href: "/connections",
              accent: "border-l-emerald-500",
            },
            {
              label: t("stats.messages"),
              value: stats.conversations,
              href: "/messages",
              accent: "border-l-sky-500",
            },
          ].map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className={`rounded-2xl border border-zinc-200 border-l-4 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tile.accent}`}
            >
              <p className="text-3xl font-bold text-zinc-900">{tile.value}</p>
              <p className="mt-1 text-sm font-medium text-zinc-600">{tile.label}</p>
            </Link>
          ))}
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
              {t("completeProfile")}
            </Link>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-lg font-bold text-zinc-900">{t("quickActionsTitle")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: "/discovery", title: t("actions.discovery"), desc: t("actions.discoveryDesc"), icon: "🔍" },
              { href: "/discovery/saved", title: t("actions.savedProfiles"), desc: t("actions.savedProfilesDesc"), icon: "🔖" },
              { href: "/connections", title: t("actions.connections"), desc: t("actions.connectionsDesc"), icon: "🤝" },
              { href: "/membership", title: t("actions.membership"), desc: t("actions.membershipDesc"), icon: "⭐" },
              { href: "/complaints", title: t("actions.complaints"), desc: t("actions.complaintsDesc"), icon: "⚠️" },
              { href: "/messages", title: t("actions.messages"), desc: t("actions.messagesDesc"), icon: "💬" },
              { href: "/video-calls", title: t("actions.videoCalls"), desc: t("actions.videoCallsDesc"), icon: "📹" },
              { href: "/profile", title: t("actions.profile"), desc: t("actions.profileDesc"), icon: "👤" },
              { href: "/profile/biodata", title: t("actions.biodata"), desc: t("actions.biodataDesc"), icon: "📄" },
              { href: "/terms", title: t("actions.terms"), desc: t("actions.termsDesc"), icon: "📋" },
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

        <section className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-zinc-900">{t("suggestionsTitle")}</h2>
            <Link
              href="/discovery"
              className="text-sm font-semibold text-rose-800 hover:text-rose-900"
            >
              {t("seeAll")}
            </Link>
          </div>
          {suggestions.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-5 py-8 text-center text-sm text-zinc-600">
              {t("suggestionsEmpty")}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {suggestions.map((item) => (
                <DiscoveryProfileCard key={item.profileCode} token={authToken} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-zinc-900">{t("savedProfilesTitle")}</h2>
            {savedProfiles.length > 0 ? (
              <Link
                href="/discovery/saved"
                className="text-sm font-semibold text-rose-800 hover:text-rose-900"
              >
                {t("seeAll")}
              </Link>
            ) : null}
          </div>
          {savedProfiles.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-5 py-8 text-center text-sm text-zinc-600">
              {t("savedProfilesEmpty")}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {savedProfiles.slice(0, 4).map((item) => (
                <DiscoveryProfileCard key={item.profileCode} token={authToken} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12 rounded-2xl border border-zinc-200 bg-white/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("trustTitle")}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[t("trust.verified"), t("trust.privacy"), t("trust.family")].map((item) => (
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
