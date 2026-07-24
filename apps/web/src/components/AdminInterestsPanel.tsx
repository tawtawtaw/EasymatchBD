"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  listAdminInterests,
  type AdminInterestFilter,
  type AdminInterestLeg,
  type AdminMemberSummary,
  type AdminRelationshipRow,
} from "@/lib/admin-interests";
import { resolveMemberDistrict } from "@/lib/member-display";
import { useMemberDropdowns } from "@/hooks/use-member-dropdowns";
import type { DropdownMap } from "@/lib/api";

type AdminInterestsPanelProps = {
  onError: (message: string | null) => void;
};

function display(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

function interestStatusClass(status: AdminInterestLeg["status"]) {
  switch (status) {
    case "accepted":
      return "bg-emerald-100 text-emerald-800";
    case "declined":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function MemberCell({
  member,
  dropdowns,
  label,
  unnamed,
  viewProfileLabel,
  loginPhoneLabel,
}: {
  member: AdminMemberSummary;
  dropdowns: DropdownMap;
  label: string;
  unnamed: string;
  viewProfileLabel: string;
  loginPhoneLabel: string;
}) {
  const name = display(member.fullName) || unnamed;
  const districtLabel = resolveMemberDistrict(member.currentDistrict, dropdowns);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="font-semibold text-zinc-900">{name}</p>
      {member.profileCode ? (
        <p className="text-xs text-zinc-600">ID: {member.profileCode}</p>
      ) : null}
      <p className="text-xs font-medium text-zinc-700">
        {loginPhoneLabel}: {display(member.phone)}
      </p>
      {districtLabel ? (
        <p className="text-xs text-zinc-500">{districtLabel}</p>
      ) : null}
      {member.profileCode ? (
        <Link
          href={`/discovery/${member.profileCode}`}
          className="mt-1 inline-block text-xs font-medium text-rose-800 hover:underline"
        >
          {viewProfileLabel}
        </Link>
      ) : null}
    </div>
  );
}

function InterestBadge({
  leg,
  noneLabel,
  statusLabel,
  sentOn,
}: {
  leg: AdminInterestLeg | null;
  noneLabel: string;
  statusLabel: (status: AdminInterestLeg["status"]) => string;
  sentOn: (date: string) => string;
}) {
  if (!leg) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
        {noneLabel}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${interestStatusClass(leg.status)}`}
      >
        {statusLabel(leg.status)}
      </span>
      <p className="text-[11px] text-zinc-500">{sentOn(leg.createdAt)}</p>
    </div>
  );
}

export function AdminInterestsPanel({ onError }: AdminInterestsPanelProps) {
  const t = useTranslations("admin.interests");
  const tp = useTranslations("privacy");
  const tc = useTranslations("common");

  const [items, setItems] = useState<AdminRelationshipRow[]>([]);
  const [summary, setSummary] = useState({
    level0: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    pending: 0,
    declined: 0,
    pendingUpgrade: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AdminInterestFilter>("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const dropdowns = useMemberDropdowns();

  const loadList = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setLoading(true);
    onError(null);
    try {
      const data = await listAdminInterests(token, {
        page,
        limit: 25,
        q: appliedSearch || undefined,
        filter,
      });
      setItems(data.items);
      setTotal(data.total);
      setSummary(data.summary);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load interests");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, filter, onError, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-300 bg-white p-4 shadow-md sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{t("title")}</h2>
          <p className="text-sm text-zinc-600">{t("hint")}</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
          {t("count", { count: total })}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([0, 1, 2, 3] as const).map((level) => (
          <div
            key={level}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              {t("summary.levelTitle", { level })}
            </p>
            <p className="text-lg font-bold text-zinc-900">
              {summary[`level${level}` as keyof typeof summary]}
            </p>
            <p className="text-xs text-zinc-600">
              {t("summary.levelLabel", {
                level,
                label: tp(String(level)),
              })}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
        <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-900">
          {t("summary.pending", { count: summary.pending })}
        </span>
        <span className="rounded-full bg-red-100 px-2 py-1 font-medium text-red-800">
          {t("summary.declined", { count: summary.declined })}
        </span>
        <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-900">
          {t("summary.pendingUpgrade", { count: summary.pendingUpgrade })}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "pending", "connected", "declined"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filter === value
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {t(`filters.${value}`)}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setAppliedSearch(search.trim());
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="field-input min-w-[220px] flex-1"
        />
        <button
          type="submit"
          className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
        >
          {t("search")}
        </button>
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-600">{tc("loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">{t("empty")}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((row) => (
            <li
              key={`${row.memberA.userId}:${row.memberB.userId}`}
              className="rounded-xl border border-zinc-200 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  {t("relationshipLevel", {
                    level: row.relationshipLevel,
                    label: tp(String(row.relationshipLevel)),
                  })}
                </span>
                {!row.connection ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                    {t("level0InterestOnly")}
                  </span>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MemberCell
                  member={row.memberA}
                  dropdowns={dropdowns}
                  label={t("memberA")}
                  unnamed={t("unnamed")}
                  viewProfileLabel={t("viewProfile")}
                  loginPhoneLabel={t("loginPhoneLabel")}
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {t("interestAtoB")}
                  </p>
                  <InterestBadge
                    leg={row.interestAtoB}
                    noneLabel={t("noInterest")}
                    statusLabel={(status) => t(`status.${status}`)}
                    sentOn={(date) => t("sentOn", { date: formatDate(date) })}
                  />
                </div>
                <MemberCell
                  member={row.memberB}
                  dropdowns={dropdowns}
                  label={t("memberB")}
                  unnamed={t("unnamed")}
                  viewProfileLabel={t("viewProfile")}
                  loginPhoneLabel={t("loginPhoneLabel")}
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {t("interestBtoA")}
                  </p>
                  <InterestBadge
                    leg={row.interestBtoA}
                    noneLabel={t("noInterest")}
                    statusLabel={(status) => t(`status.${status}`)}
                    sentOn={(date) => t("sentOn", { date: formatDate(date) })}
                  />
                </div>
              </div>

              {row.connection ? (
                <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-zinc-800">
                  <p className="font-semibold text-zinc-900">{t("connected")}</p>
                  <p className="mt-1">
                    {t("privacyLevel", {
                      level: row.connection.privacyLevel,
                      label: tp(String(row.connection.privacyLevel)),
                    })}
                  </p>
                  {row.connection.pendingUpgradeLevel != null ? (
                    <p className="mt-1 text-xs text-amber-900">
                      {t("pendingUpgrade", {
                        level: row.connection.pendingUpgradeLevel,
                        label: tp(String(row.connection.pendingUpgradeLevel)),
                        name:
                          row.connection.pendingUpgradeByName ?? t("unknownMember"),
                      })}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">{t("notConnected")}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 disabled:opacity-50"
          >
            {t("prevPage")}
          </button>
          <span className="text-xs text-zinc-600">
            {t("pageOf", { page, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 disabled:opacity-50"
          >
            {t("nextPage")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
