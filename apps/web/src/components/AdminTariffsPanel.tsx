"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  getAdminMembershipTariffs,
  updateAdminMembershipTariffs,
  type MembershipTariffConfig,
} from "@/lib/admin";

type EditableTariff = MembershipTariffConfig;

export function AdminTariffsPanel({
  onError,
  onMessage,
}: {
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
}) {
  const t = useTranslations("admin.tariffs");
  const tc = useTranslations("common");
  const [tariffs, setTariffs] = useState<EditableTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadTariffs = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    const data = await getAdminMembershipTariffs(token);
    setTariffs(data);
    setDirty(false);
  }, []);

  useEffect(() => {
    loadTariffs()
      .catch((err) =>
        onError(err instanceof Error ? err.message : t("loadError")),
      )
      .finally(() => setLoading(false));
  }, [loadTariffs, onError, tc]);

  function updateTariff(plan: string, patch: Partial<EditableTariff>) {
    setTariffs((current) =>
      current.map((row) => (row.plan === plan ? { ...row, ...patch } : row)),
    );
    setDirty(true);
    onMessage(null);
    onError(null);
  }

  async function handleSave() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setSaving(true);
    onError(null);
    try {
      const updated = await updateAdminMembershipTariffs(
        token,
        tariffs.map((row) => ({
          plan: row.plan,
          labelEn: row.labelEn,
          labelBn: row.labelBn,
          priceBdt: Number(row.priceBdt),
          currency: row.currency,
          durationDays: row.durationDays,
          isActive: row.isActive,
          sortOrder: row.sortOrder,
          descriptionEn: row.descriptionEn,
          descriptionBn: row.descriptionBn,
        })),
      );
      setTariffs(updated);
      setDirty(false);
      onMessage(t("saved"));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">{tc("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("hint")}</p>
      </div>

      <div className="space-y-4">
        {tariffs.map((row) => (
          <article
            key={row.plan}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-zinc-900">
                {t("planLabel", { plan: row.plan })}
              </h3>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={row.isActive}
                  onChange={(event) =>
                    updateTariff(row.plan, { isActive: event.target.checked })
                  }
                />
                {row.isActive ? t("active") : t("inactive")}
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">{t("labelEn")}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={row.labelEn}
                  onChange={(event) =>
                    updateTariff(row.plan, { labelEn: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">{t("labelBn")}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={row.labelBn ?? ""}
                  onChange={(event) =>
                    updateTariff(row.plan, { labelBn: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">{t("priceBdt")}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={row.priceBdt}
                  onChange={(event) =>
                    updateTariff(row.plan, { priceBdt: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">{t("durationDays")}</span>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={row.durationDays}
                  onChange={(event) =>
                    updateTariff(row.plan, {
                      durationDays: Number(event.target.value) || 1,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">{t("sortOrder")}</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={row.sortOrder}
                  onChange={(event) =>
                    updateTariff(row.plan, {
                      sortOrder: Number(event.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">{t("currency")}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={row.currency}
                  onChange={(event) =>
                    updateTariff(row.plan, { currency: event.target.value })
                  }
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">{t("descriptionEn")}</span>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={row.descriptionEn ?? ""}
                  onChange={(event) =>
                    updateTariff(row.plan, { descriptionEn: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">{t("descriptionBn")}</span>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  value={row.descriptionBn ?? ""}
                  onChange={(event) =>
                    updateTariff(row.plan, { descriptionBn: event.target.value })
                  }
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
          className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? tc("saving") : t("saveAll")}
        </button>
        {dirty ? (
          <p className="text-sm text-amber-700">{t("unsavedChanges")}</p>
        ) : null}
      </div>
    </div>
  );
}
