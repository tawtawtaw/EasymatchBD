"use client";

import type { AdminAndroidAppReleaseStatus } from "@easymatch/shared";
import { useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { getAdminAppRelease, publishAdminAppRelease } from "@/lib/admin";

function formatApkSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminAppReleasePanel({
  onError,
  onMessage,
}: {
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
}) {
  const t = useTranslations("admin.appDownload");
  const [status, setStatus] = useState<AdminAndroidAppReleaseStatus | null>(null);
  const [versionCode, setVersionCode] = useState("");
  const [versionName, setVersionName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function takeApkFile(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    if (!next.name.toLowerCase().endsWith(".apk")) {
      onError(t("fileRequired"));
      return;
    }
    setFile(next);
    onError(null);
  }

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    return getAdminAppRelease(token);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((row) => {
        if (cancelled || row == null) return;
        setStatus(row);
        setVersionCode(String(row.nextVersionCode));
      })
      .catch((err) => {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : t("loadError"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, onError, t]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !file) {
      onError(t("fileRequired"));
      return;
    }
    setSaving(true);
    onError(null);
    try {
      const next = await publishAdminAppRelease(token, {
        versionCode,
        versionName,
        file,
      });
      setStatus(next);
      setVersionCode(String(next.nextVersionCode));
      setVersionName("");
      setFile(null);
      onMessage(t("published"));
    } catch (err) {
      onError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">{t("loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">{t("hint")}</p>
      </div>

      {status?.current ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t("current", {
            name: status.current.versionName,
            code: String(status.current.versionCode),
          })}
        </p>
      ) : (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("nonePublished")}
        </p>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="max-w-xl space-y-4">
        <label className="block text-sm font-medium text-zinc-800">
          {t("versionCode")}
          <input
            type="number"
            min={1}
            required
            value={versionCode}
            onChange={(event) => setVersionCode(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-zinc-500">{t("versionCodeHint")}</p>
        <label className="block text-sm font-medium text-zinc-800">
          {t("versionName")}
          <input
            type="text"
            required
            maxLength={32}
            placeholder="0.2.0"
            value={versionName}
            onChange={(event) => setVersionName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <div>
          <p className="text-sm font-medium text-zinc-800">{t("apkFile")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            key={status?.nextVersionCode ?? "apk"}
            onChange={(event) => {
              takeApkFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            className="sr-only"
          />
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              takeApkFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`mt-1 rounded-xl border-2 border-dashed px-4 py-6 ${
              dragOver
                ? "border-rose-600 bg-rose-50"
                : "border-zinc-300 bg-zinc-50"
            }`}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-rose-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-900"
            >
              {t("chooseApk")}
            </button>
            <p className="mt-3 text-sm text-zinc-600">{t("dropHint")}</p>
            <p className="mt-1 text-sm font-medium text-zinc-800">
              {file
                ? t("fileSelected", {
                    name: file.name,
                    size: formatApkSize(file.size),
                  })
                : t("noFileChosen")}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-rose-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
        >
          {saving ? t("publishing") : t("publish")}
        </button>
      </form>
    </div>
  );
}
