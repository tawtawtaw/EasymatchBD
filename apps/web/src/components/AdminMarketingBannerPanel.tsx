"use client";

import {
  isMarketingBannerActive,
  marketingBannerLabel,
  marketingBannerMessage,
  tariffCalendarDate,
  type MarketingBannerConfig,
} from "@easymatch/shared";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { MarketingBannerBar } from "@/components/MarketingBannerBar";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  getAdminMarketingBanner,
  updateAdminMarketingBanner,
} from "@/lib/admin";

type FormState = {
  enabled: boolean;
  messageEn: string;
  messageBn: string;
  labelEn: string;
  labelBn: string;
  href: string;
  startsAt: string;
  endsAt: string;
};

function toForm(row: MarketingBannerConfig): FormState {
  return {
    enabled: row.enabled,
    messageEn: row.messageEn,
    messageBn: row.messageBn ?? "",
    labelEn: row.labelEn ?? "",
    labelBn: row.labelBn ?? "",
    href: row.href ?? "",
    startsAt: tariffCalendarDate(row.startsAt) ?? "",
    endsAt: tariffCalendarDate(row.endsAt) ?? "",
  };
}

export function AdminMarketingBannerPanel({
  onError,
  onMessage,
}: {
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
}) {
  const t = useTranslations("admin.banner");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    return toForm(await getAdminMarketingBanner(token));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadError = t("loadError");
    load()
      .then((row) => {
        if (cancelled || row == null) return;
        setForm(row);
        setDirty(false);
      })
      .catch((err) => {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : loadError);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, onError, t]);

  function update(patch: Partial<FormState>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    onMessage(null);
    onError(null);
  }

  async function handleSave() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !form) return;

    setSaving(true);
    onError(null);
    try {
      const updated = await updateAdminMarketingBanner(token, {
        enabled: form.enabled,
        messageEn: form.messageEn,
        messageBn: form.messageBn.trim() || null,
        labelEn: form.labelEn.trim() || null,
        labelBn: form.labelBn.trim() || null,
        href: form.href.trim() || null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      });
      setForm(toForm(updated));
      setDirty(false);
      onMessage(t("saved"));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return <p className="text-sm text-zinc-600">{tc("loading")}</p>;
  }

  const previewBanner = {
    messageEn: form.messageEn,
    messageBn: form.messageBn || null,
    labelEn: form.labelEn || null,
    labelBn: form.labelBn || null,
    href: form.href.trim() || null,
    enabled: form.enabled,
    startsAt: form.startsAt || null,
    endsAt: form.endsAt || null,
  };
  const previewLive = isMarketingBannerActive(previewBanner);
  const previewMessage = marketingBannerMessage(previewBanner, locale);
  const previewLabel = marketingBannerLabel(previewBanner, locale);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("hint")}</p>
      </div>

      <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(event) => update({ enabled: event.target.checked })}
        />
        {t("enabled")}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("messageEn")}
          </span>
          <textarea
            className="field-input min-h-24 w-full"
            maxLength={220}
            value={form.messageEn}
            onChange={(event) => update({ messageEn: event.target.value })}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("messageBn")}
          </span>
          <textarea
            className="field-input min-h-24 w-full"
            maxLength={220}
            value={form.messageBn}
            onChange={(event) => update({ messageBn: event.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("labelEn")}
          </span>
          <input
            className="field-input w-full"
            maxLength={40}
            value={form.labelEn}
            onChange={(event) => update({ labelEn: event.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("labelBn")}
          </span>
          <input
            className="field-input w-full"
            maxLength={40}
            value={form.labelBn}
            onChange={(event) => update({ labelBn: event.target.value })}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("href")}
          </span>
          <input
            className="field-input w-full"
            placeholder="/membership"
            maxLength={200}
            value={form.href}
            onChange={(event) => update({ href: event.target.value })}
          />
          <span className="text-xs text-zinc-500">{t("hrefHint")}</span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("startsAt")}
          </span>
          <input
            type="date"
            className="field-input w-full"
            value={form.startsAt}
            onChange={(event) => update({ startsAt: event.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("endsAt")}
          </span>
          <input
            type="date"
            className="field-input w-full"
            value={form.endsAt}
            onChange={(event) => update({ endsAt: event.target.value })}
          />
        </label>
      </div>
      <p className="text-xs text-zinc-500">{t("datesHint")}</p>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          {t("preview")}
        </p>
        {previewLive && previewMessage ? (
          <div className="overflow-hidden rounded-xl">
            <MarketingBannerBar
              message={previewMessage}
              label={previewLabel}
              href={previewBanner.href}
              learnMore={t("learnMore")}
            />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            {t("previewHidden")}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || !dirty}
        className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
      >
        {saving ? tc("saving") : t("save")}
      </button>
    </div>
  );
}
