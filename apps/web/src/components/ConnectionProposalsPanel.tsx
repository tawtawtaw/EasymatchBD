"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  IncomingInterest,
  OutgoingInterest,
  listInterests,
  respondDiscoveryInterest,
  withdrawDiscoveryInterest,
} from "@/lib/discovery";
import {
  formatInterestProfileMeta,
  resolveMemberDisplayName,
} from "@/lib/member-display";
import { useMemberDiscoveryStats } from "@/hooks/use-member-discovery-stats";
import { useMemberDropdowns } from "@/hooks/use-member-dropdowns";

type ProposalTab = "incoming" | "outgoing";

type ConnectionProposalsPanelProps = {
  onConnectionFormed?: () => void;
};

export function ConnectionProposalsPanel({
  onConnectionFormed,
}: ConnectionProposalsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("connections");
  const td = useTranslations("discovery");
  const tc = useTranslations("common");
  const [incoming, setIncoming] = useState<IncomingInterest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingInterest[]>([]);
  const [proposalTab, setProposalTab] = useState<ProposalTab>("incoming");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdowns = useMemberDropdowns();
  const { stats: liveStats } = useMemberDiscoveryStats();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "incoming" || tab === "outgoing") {
      setProposalTab(tab);
    }
  }, [searchParams]);

  const loadProposals = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const { incoming: incomingList, outgoing: outgoingList } =
        await listInterests(token);
      setIncoming(incomingList);
      setOutgoing(outgoingList);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  useEffect(() => {
    void loadProposals();
  }, [liveStats.incoming, liveStats.outgoing, liveStats.connections, loadProposals]);

  async function handleRespond(interestId: string, accept: boolean) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(interestId);
    setError(null);
    try {
      await respondDiscoveryInterest(token, interestId, accept);
      setIncoming((prev) => prev.filter((interest) => interest.id !== interestId));
      if (accept) {
        onConnectionFormed?.();
      }
      await loadProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(null);
    }
  }

  async function handleWithdraw(interestId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    setActing(interestId);
    setError(null);
    try {
      await withdrawDiscoveryInterest(token, interestId);
      await loadProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.error"));
    } finally {
      setActing(null);
    }
  }

  function formatSentDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function selectTab(tab: ProposalTab) {
    setProposalTab(tab);
    router.replace(`/connections?tab=${tab}`, { scroll: false });
  }

  return (
    <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-100 pb-3">
        <button
          type="button"
          onClick={() => selectTab("incoming")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            proposalTab === "incoming"
              ? "bg-rose-800 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          {t("proposalsToMe")}
          {incoming.length > 0 ? ` (${incoming.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => selectTab("outgoing")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            proposalTab === "outgoing"
              ? "bg-rose-800 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          {t("proposalsByMe")}
          {outgoing.length > 0 ? ` (${outgoing.length})` : ""}
        </button>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">{tc("loading")}</p>
      ) : proposalTab === "incoming" ? (
        incoming.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("noProposalsToMe")}</p>
        ) : (
          <ul className="space-y-3">
            {incoming.map((interest) => {
              const profile = interest.sender.profile;
              const name = resolveMemberDisplayName(profile ?? {}, {
                profileRef: (code) => td("profileRef", { code }),
                anonymous: td("anonymousMember"),
              });
              const subtitle = formatInterestProfileMeta(
                profile,
                dropdowns,
                profile?.isVerified ? td("verifiedBadge") : null,
              );
              return (
                <li
                  key={interest.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{name}</p>
                    {subtitle ? (
                      <p className="text-sm text-zinc-500">{subtitle}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-zinc-500">
                      {td("interestLevel0Hint")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile?.profileCode ? (
                      <Link
                        href={`/discovery/${profile.profileCode}`}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-white"
                      >
                        {td("viewProfile")}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      disabled={acting === interest.id}
                      onClick={() => void handleRespond(interest.id, true)}
                      className="rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
                    >
                      {td("acceptInterest")}
                    </button>
                    <button
                      type="button"
                      disabled={acting === interest.id}
                      onClick={() => void handleRespond(interest.id, false)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-white disabled:opacity-60"
                    >
                      {td("declineInterest")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : outgoing.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("noProposalsByMe")}</p>
      ) : (
        <ul className="space-y-3">
          {outgoing.map((interest) => {
            const profile = interest.receiver.profile;
            const name = resolveMemberDisplayName(profile ?? {}, {
              profileRef: (code) => td("profileRef", { code }),
              anonymous: td("anonymousMember"),
            });
            const subtitle = formatInterestProfileMeta(
              profile,
              dropdowns,
              profile?.isVerified ? td("verifiedBadge") : null,
            );
            return (
            <li
              key={interest.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
            >
              <div>
                <p className="font-medium text-zinc-900">{name}</p>
                {subtitle ? (
                  <p className="text-sm text-zinc-500">{subtitle}</p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-500">
                  {td("outgoingLevel0Hint")}
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  {td("sentOn", { date: formatSentDate(interest.createdAt) })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile?.profileCode ? (
                  <Link
                    href={`/discovery/${profile.profileCode}`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-white"
                  >
                    {td("viewProfile")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  disabled={acting === interest.id}
                  onClick={() => void handleWithdraw(interest.id)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-white disabled:opacity-60"
                >
                  {td("withdrawInterest")}
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
