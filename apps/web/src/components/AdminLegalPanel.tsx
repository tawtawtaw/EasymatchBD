"use client";

import type { TermsSection, TermsSubsection } from "@easymatch/shared";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  cancelAdminTermsSchedule,
  discardAdminTermsDraft,
  formatAdminActor,
  getAdminTermsAuditLog,
  getAdminTermsState,
  publishAdminTerms,
  saveAdminTermsDraft,
  scheduleAdminTermsPublish,
  type AdminTermsState,
  type TermsAuditEntry,
} from "@/lib/admin-legal";

type ContentLocale = "en" | "bn";

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(items?: string[]): string {
  return (items ?? []).join("\n");
}

function SubsectionEditor({
  subsection,
  onChange,
}: {
  subsection: TermsSubsection;
  onChange: (next: TermsSubsection) => void;
}) {
  const t = useTranslations("admin.legal");

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase text-zinc-500">
          {t("fields.subsectionTitle")}
        </span>
        <input
          className="field-input w-full"
          value={subsection.title}
          onChange={(e) => onChange({ ...subsection, title: e.target.value })}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase text-zinc-500">
          {t("fields.paragraphs")}
        </span>
        <textarea
          className="field-input min-h-20 w-full"
          value={listToLines(subsection.paragraphs)}
          onChange={(e) =>
            onChange({ ...subsection, paragraphs: linesToList(e.target.value) })
          }
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase text-zinc-500">
          {t("fields.bullets")}
        </span>
        <textarea
          className="field-input min-h-20 w-full"
          value={listToLines(subsection.bullets)}
          onChange={(e) =>
            onChange({ ...subsection, bullets: linesToList(e.target.value) })
          }
        />
      </label>
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
}: {
  section: TermsSection;
  onChange: (next: TermsSection) => void;
}) {
  const t = useTranslations("admin.legal");

  return (
    <details className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-bold text-zinc-900">
        {section.id} — {section.title}
      </summary>
      <div className="mt-4 space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("fields.sectionTitle")}
          </span>
          <input
            className="field-input w-full"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("fields.intro")}
          </span>
          <textarea
            className="field-input min-h-16 w-full"
            value={section.intro ?? ""}
            onChange={(e) =>
              onChange({ ...section, intro: e.target.value || undefined })
            }
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("fields.paragraphs")}
          </span>
          <textarea
            className="field-input min-h-20 w-full"
            value={listToLines(section.paragraphs)}
            onChange={(e) =>
              onChange({ ...section, paragraphs: linesToList(e.target.value) })
            }
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-zinc-500">
            {t("fields.bullets")}
          </span>
          <textarea
            className="field-input min-h-24 w-full"
            value={listToLines(section.bullets)}
            onChange={(e) =>
              onChange({ ...section, bullets: linesToList(e.target.value) })
            }
          />
        </label>
        {section.subsections && section.subsections.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              {t("fields.subsections")}
            </p>
            {section.subsections.map((subsection, index) => (
              <SubsectionEditor
                key={`${subsection.title}-${index}`}
                subsection={subsection}
                onChange={(next) => {
                  const subsections = [...(section.subsections ?? [])];
                  subsections[index] = next;
                  onChange({ ...section, subsections });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

type AdminLegalPanelProps = {
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
};

export function AdminLegalPanel({ onError, onMessage }: AdminLegalPanelProps) {
  const t = useTranslations("admin.legal");
  const tc = useTranslations("common");
  const [state, setState] = useState<AdminTermsState | null>(null);
  const [auditLog, setAuditLog] = useState<TermsAuditEntry[]>([]);
  const [contentLocale, setContentLocale] = useState<ContentLocale>("en");
  const [scheduleAt, setScheduleAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    const [data, log] = await Promise.all([
      getAdminTermsState(token),
      getAdminTermsAuditLog(token),
    ]);
    setState(data);
    setAuditLog(log);
    if (data.schedule?.scheduledPublishAt) {
      const local = new Date(data.schedule.scheduledPublishAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      setScheduleAt(
        `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`,
      );
    } else {
      setScheduleAt("");
    }
  }, []);

  useEffect(() => {
    load()
      .catch((err) =>
        onError(err instanceof Error ? err.message : "Failed to load terms"),
      )
      .finally(() => setLoading(false));
  }, [load, onError]);

  function updateDraft(partial: Partial<AdminTermsState["draft"]>) {
    setState((prev) =>
      prev
        ? {
            ...prev,
            draft: { ...prev.draft, ...partial },
            hasDraftChanges: true,
          }
        : prev,
    );
  }

  function updateSection(index: number, next: TermsSection) {
    if (!state) return;
    const key = contentLocale === "en" ? "sectionsEn" : "sectionsBn";
    const sections = [...state.draft[key]];
    sections[index] = next;
    updateDraft({ [key]: sections });
  }

  async function handleSaveDraft() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !state) return;
    setActing("save");
    onError(null);
    onMessage(null);
    try {
      const next = await saveAdminTermsDraft(token, state.draft);
      setState(next);
      onMessage(t("draftSaved"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setActing(null);
    }
  }

  async function handlePublish() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !state) return;
    const confirmed = window.confirm(t("publishConfirm", { version: state.draft.version }));
    if (!confirmed) return;

    setActing("publish");
    onError(null);
    onMessage(null);
    try {
      if (state.hasDraftChanges) {
        await saveAdminTermsDraft(token, state.draft);
      }
      const result = await publishAdminTerms(token, state.draft.version);
      await load();
      onMessage(t("published", { version: result.version }));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setActing(null);
    }
  }

  async function handleSchedule() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !state) return;
    if (!scheduleAt) {
      onError(t("scheduleRequired"));
      return;
    }
    if (
      !window.confirm(
        t("scheduleConfirm", { when: new Date(scheduleAt).toLocaleString() }),
      )
    ) {
      return;
    }

    setActing("schedule");
    onError(null);
    onMessage(null);
    try {
      if (state.hasDraftChanges) {
        await saveAdminTermsDraft(token, state.draft);
      }
      const next = await scheduleAdminTermsPublish(
        token,
        new Date(scheduleAt).toISOString(),
      );
      setState(next);
      await load();
      onMessage(t("scheduled"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setActing(null);
    }
  }

  async function handleCancelSchedule() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    if (!window.confirm(t("cancelScheduleConfirm"))) return;

    setActing("cancelSchedule");
    onError(null);
    onMessage(null);
    try {
      const next = await cancelAdminTermsSchedule(token);
      setState(next);
      await load();
      onMessage(t("scheduleCancelled"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to cancel schedule");
    } finally {
      setActing(null);
    }
  }

  async function handleDiscard() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    if (!window.confirm(t("discardConfirm"))) return;

    setActing("discard");
    onError(null);
    onMessage(null);
    try {
      const next = await discardAdminTermsDraft(token);
      setState(next);
      await load();
      onMessage(t("draftDiscarded"));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to discard draft");
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">{tc("loading")}</p>;
  }

  if (!state) {
    return <p className="text-sm text-red-700">{t("loadFailed")}</p>;
  }

  const sections =
    contentLocale === "en" ? state.draft.sectionsEn : state.draft.sectionsBn;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md">
        <h2 className="text-lg font-bold text-zinc-950">{t("title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("hint")}</p>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-zinc-500">{t("liveVersion")}</dt>
            <dd className="font-semibold text-zinc-900">{state.published.version}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500">{t("lastPublished")}</dt>
            <dd className="font-semibold text-zinc-900">
              {new Date(state.published.publishedAt).toLocaleString()}
            </dd>
          </div>
        </dl>

        {state.hasDraftChanges && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {t("unsavedDraft")}
          </p>
        )}

        {state.schedule && (
          <p className="mt-4 rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-950">
            {t("scheduledBanner", {
              when: new Date(state.schedule.scheduledPublishAt).toLocaleString(),
              who: formatAdminActor(state.schedule.scheduledBy),
            })}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md space-y-4">
        <h3 className="text-base font-bold text-zinc-950">{t("metadataTitle")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-800">{t("fields.version")}</span>
            <input
              className="field-input w-full"
              value={state.draft.version}
              onChange={(e) => updateDraft({ version: e.target.value })}
              placeholder="2026-12-01"
            />
            <span className="text-xs text-zinc-500">{t("versionHint")}</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-800">
              {t("fields.effectiveDateEn")}
            </span>
            <input
              className="field-input w-full"
              value={state.draft.effectiveDateEn}
              onChange={(e) => updateDraft({ effectiveDateEn: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-800">
              {t("fields.effectiveDateBn")}
            </span>
            <input
              className="field-input w-full"
              value={state.draft.effectiveDateBn}
              onChange={(e) => updateDraft({ effectiveDateBn: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-zinc-950">{t("contentTitle")}</h3>
          <div className="flex gap-2">
            {(["en", "bn"] as ContentLocale[]).map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => setContentLocale(locale)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  contentLocale === locale
                    ? "bg-rose-700 text-white"
                    : "border border-zinc-300 text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {locale === "en" ? t("localeEn") : t("localeBn")}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-zinc-600">{t("contentHint")}</p>

        <div className="space-y-3">
          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              onChange={(next) => updateSection(index, next)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/terms-preview"
          target="_blank"
          className="rounded-lg border border-violet-300 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-900 hover:bg-violet-100"
        >
          {t("previewDraft")}
        </Link>
        <button
          type="button"
          disabled={acting !== null}
          onClick={handleSaveDraft}
          className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
        >
          {acting === "save" ? t("savingDraft") : t("saveDraft")}
        </button>
        <button
          type="button"
          disabled={acting !== null}
          onClick={handlePublish}
          className="rounded-lg bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
        >
          {acting === "publish" ? t("publishing") : t("publish")}
        </button>
        {state.hasDraftChanges && (
          <button
            type="button"
            disabled={acting !== null}
            onClick={handleDiscard}
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {acting === "discard" ? t("discarding") : t("discardDraft")}
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md space-y-4">
        <h3 className="text-base font-bold text-zinc-950">{t("scheduleTitle")}</h3>
        <p className="text-sm text-zinc-600">{t("scheduleHint")}</p>
        <label className="block max-w-sm space-y-1">
          <span className="text-sm font-medium text-zinc-800">{t("scheduleAt")}</span>
          <input
            type="datetime-local"
            className="field-input w-full"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            disabled={Boolean(state.schedule)}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          {!state.schedule ? (
            <button
              type="button"
              disabled={acting !== null || !scheduleAt}
              onClick={handleSchedule}
              className="rounded-lg border border-violet-300 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-60"
            >
              {acting === "schedule" ? t("scheduling") : t("schedulePublish")}
            </button>
          ) : (
            <button
              type="button"
              disabled={acting !== null}
              onClick={handleCancelSchedule}
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {acting === "cancelSchedule" ? t("cancellingSchedule") : t("cancelSchedule")}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md space-y-4">
        <h3 className="text-base font-bold text-zinc-950">{t("auditTitle")}</h3>
        <p className="text-sm text-zinc-600">{t("auditHint")}</p>
        {auditLog.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("auditEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <th className="px-3 py-2">{t("auditColumns.when")}</th>
                  <th className="px-3 py-2">{t("auditColumns.action")}</th>
                  <th className="px-3 py-2">{t("auditColumns.version")}</th>
                  <th className="px-3 py-2">{t("auditColumns.by")}</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-zinc-100">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(entry.performedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {t(`auditActions.${entry.action}`)}
                      {entry.scheduledFor && entry.action === "scheduled" && (
                        <span className="block text-xs text-zinc-500">
                          {t("auditScheduledFor", {
                            when: new Date(entry.scheduledFor).toLocaleString(),
                          })}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{entry.version}</td>
                    <td className="px-3 py-2">
                      {formatAdminActor(entry.performedBy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
