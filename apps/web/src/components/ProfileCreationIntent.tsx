"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  ON_BEHALF_RELATIONS,
  PROFILE_CREATION_MODES,
  type OnBehalfRelation,
  type ProfileCreationMode,
} from "@easymatch/shared";
import { setCreationIntent } from "@/lib/api";

type ProfileCreationIntentProps = {
  token: string;
  onComplete: () => void;
};

export function ProfileCreationIntent({
  token,
  onComplete,
}: ProfileCreationIntentProps) {
  const t = useTranslations("profile.creationIntent");
  const [mode, setMode] = useState<ProfileCreationMode | null>(null);
  const [relation, setRelation] = useState<OnBehalfRelation | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!mode) return;
    if (mode === "on_behalf" && !relation) {
      setError(t("relationRequired"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await setCreationIntent(token, {
        creationMode: mode,
        onBehalfRelation:
          mode === "on_behalf" ? (relation as OnBehalfRelation) : undefined,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="text-zinc-600">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PROFILE_CREATION_MODES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              if (value === "self") setRelation("");
              setError(null);
            }}
            className={`rounded-2xl border p-5 text-left transition ${
              mode === value
                ? "border-rose-500 bg-rose-50 shadow-sm"
                : "border-zinc-300 bg-white hover:border-rose-200"
            }`}
          >
            <p className="text-lg font-semibold text-zinc-900">
              {t(`modes.${value}.title`)}
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              {t(`modes.${value}.description`)}
            </p>
          </button>
        ))}
      </div>

      {mode === "on_behalf" ? (
        <label className="block space-y-2">
          <span className="field-label">{t("relationLabel")}</span>
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value as OnBehalfRelation | "")}
            className="field-input px-4 py-3"
          >
            <option value="">{t("relationPlaceholder")}</option>
            {ON_BEHALF_RELATIONS.map((value) => (
              <option key={value} value={value}>
                {t(`relations.${value}`)}
              </option>
            ))}
          </select>
          <p className="text-sm text-amber-800">{t("onBehalfNidHint")}</p>
        </label>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!mode || loading}
        onClick={() => void handleContinue()}
        className="w-full rounded-lg bg-rose-700 px-4 py-3 font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60"
      >
        {loading ? t("saving") : t("continue")}
      </button>
    </div>
  );
}
