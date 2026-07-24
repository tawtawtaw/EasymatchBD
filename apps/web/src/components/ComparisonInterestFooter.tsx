"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { PaidMembershipRequired } from "@/components/PaidMembershipRequired";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import type { DiscoveryRelationship } from "@/lib/discovery";
import {
  respondDiscoveryInterest,
  sendDiscoveryInterest,
} from "@/lib/discovery";

type ComparisonInterestFooterProps = {
  profileCode: string;
  otherName: string;
  mutualScore: number;
  relationship: DiscoveryRelationship;
  isPaid: boolean;
  sessionReady: boolean;
  onUpdated: () => Promise<void>;
};

export function ComparisonInterestFooter({
  profileCode,
  otherName,
  mutualScore,
  relationship,
  isPaid,
  sessionReady,
  onUpdated,
}: ComparisonInterestFooterProps) {
  const router = useRouter();
  const t = useTranslations("comparison.interest");
  const td = useTranslations("discovery");
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rel, setRel] = useState(relationship);

  useEffect(() => {
    setRel(relationship);
  }, [relationship]);

  if (relationship.status === "self") {
    return null;
  }

  async function handleSendInterest() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await sendDiscoveryInterest(token, profileCode);
      setRel((current) => ({
        ...current,
        status: result.status as DiscoveryRelationship["status"],
      }));
      setMessage(td("actions.success"));
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : td("actions.error"));
    } finally {
      setActing(false);
    }
  }

  async function handleRespondIncomingInterest(accept: boolean) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !rel.receivedInterestId) return;

    setActing(true);
    setError(null);
    setMessage(null);
    try {
      await respondDiscoveryInterest(token, rel.receivedInterestId, accept);
      if (accept) {
        router.push("/connections");
        return;
      }
      setRel((current) => ({ ...current, status: "none" }));
      setMessage(td("actions.success"));
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : td("actions.error"));
    } finally {
      setActing(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{t("title")}</h2>
      <p className="mt-2 text-sm text-zinc-600">
        {t("body", { name: otherName, score: mutualScore })}
      </p>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isPaid && sessionReady ? (
          <PaidMembershipRequired feature="interest" compact />
        ) : null}

        {isPaid && rel.status === "none" ? (
          <button
            type="button"
            disabled={acting}
            onClick={() => void handleSendInterest()}
            className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
          >
            {td("expressInterest")}
          </button>
        ) : null}

        {rel.status === "interest_sent" ? (
          <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
            {td("interestSent")}
          </span>
        ) : null}

        {rel.status === "interest_received" ? (
          <>
            <span className="rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-900">
              {td("interestReceived")}
            </span>
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleRespondIncomingInterest(true)}
              className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
            >
              {td("acceptInterest")}
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleRespondIncomingInterest(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {td("declineInterest")}
            </button>
          </>
        ) : null}

        {rel.status === "connected" ? (
          <>
            <span className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900">
              {td("connected")}
            </span>
            {rel.connectionId ? (
              <Link
                href={`/messages/${rel.connectionId}`}
                className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
              >
                {td("message")}
              </Link>
            ) : null}
          </>
        ) : null}

        <Link
          href={`/discovery/${profileCode}`}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          {t("viewProfile")}
        </Link>
      </div>
    </section>
  );
}
