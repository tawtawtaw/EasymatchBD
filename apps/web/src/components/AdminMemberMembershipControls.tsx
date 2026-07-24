"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  setAdminMemberPlan,
  type MembershipPlan,
} from "@/lib/membership-api";

type AdminMemberMembershipControlsProps = {
  userId: string;
  subscriptionPlan: string | null;
  isPaidMember: boolean;
  onUpdated: (plan: string, isPaid: boolean) => void;
};

export function AdminMemberMembershipControls({
  userId,
  subscriptionPlan,
  isPaidMember,
  onUpdated,
}: AdminMemberMembershipControlsProps) {
  const t = useTranslations("admin.profiles.membership");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyPlan(plan: MembershipPlan) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setBusy(true);
    setError(null);
    try {
      const result = await setAdminMemberPlan(token, userId, plan);
      onUpdated(result.subscription.plan, result.isPaidMember);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  const plan = subscriptionPlan ?? "free";

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-950">{t("title")}</h3>
      <p className="mt-1 text-sm text-amber-900">
        {t("current", { plan })}
        {isPaidMember ? ` · ${t("paid")}` : ` · ${t("free")}`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void applyPlan("gold")}
          className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-60"
        >
          {t("grantGold")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void applyPlan("platinum")}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {t("grantPlatinum")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void applyPlan("free")}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {t("resetFree")}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
