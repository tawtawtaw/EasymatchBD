"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import {
  getAdminPrivacyFields,
  updateAdminPrivacyFields,
  type PrivacyFieldConfig,
} from "@/lib/admin";

const SECTION_ORDER = ["personal", "family", "marital", "partner", "media"] as const;
const LEVELS = [0, 1, 2, 3] as const;

type EditableField = {
  fieldKey: string;
  section: string;
  isShareable: boolean;
  minPrivacyLevel: number;
};

export function AdminPrivacyFieldsPanel({
  onError,
  onMessage,
}: {
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
}) {
  const t = useTranslations("admin.privacyFields");
  const tp = useTranslations("privacy");
  const tc = useTranslations("common");
  const [fields, setFields] = useState<EditableField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadFields = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    const data = await getAdminPrivacyFields(token);
    setFields(
      data.map((row: PrivacyFieldConfig) => ({
        fieldKey: row.fieldKey,
        section: row.section,
        isShareable: row.isShareable,
        minPrivacyLevel: row.minPrivacyLevel,
      })),
    );
    setDirty(false);
  }, []);

  useEffect(() => {
    loadFields()
      .catch((err) =>
        onError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [loadFields, onError]);

  const grouped = useMemo(() => {
    const map = new Map<string, EditableField[]>();
    for (const field of fields) {
      const list = map.get(field.section) ?? [];
      list.push(field);
      map.set(field.section, list);
    }
    return SECTION_ORDER.filter((section) => map.has(section)).map((section) => ({
      section,
      items: map.get(section) ?? [],
    }));
  }, [fields]);

  function updateField(
    fieldKey: string,
    patch: Partial<Pick<EditableField, "isShareable" | "minPrivacyLevel">>,
  ) {
    setFields((current) =>
      current.map((field) =>
        field.fieldKey === fieldKey ? { ...field, ...patch } : field,
      ),
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
      await updateAdminPrivacyFields(
        token,
        fields.map((field) => ({
          fieldKey: field.fieldKey,
          isShareable: field.isShareable,
          minPrivacyLevel: field.minPrivacyLevel,
        })),
      );
      onMessage(t("saved"));
      setDirty(false);
      await loadFields();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function fieldLabel(fieldKey: string) {
    return t.has(`fields.${fieldKey}`) ? t(`fields.${fieldKey}`) : fieldKey;
  }

  function sectionLabel(section: string) {
    return t.has(`sections.${section}`) ? t(`sections.${section}`) : section;
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">{tc("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md">
        <h2 className="text-lg font-bold text-zinc-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("hint")}</p>

        <div className="mt-4 overflow-x-auto">
          {grouped.map(({ section, items }) => (
            <div key={section} className="mb-8 last:mb-0">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-600">
                {sectionLabel(section)}
              </h3>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    <th className="px-2 py-2">{t("columns.field")}</th>
                    <th className="px-2 py-2">{t("columns.share")}</th>
                    <th className="px-2 py-2">{t("columns.minLevel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((field) => (
                    <tr key={field.fieldKey} className="border-b border-zinc-100">
                      <td className="px-2 py-3 font-medium text-zinc-900">
                        {fieldLabel(field.fieldKey)}
                        <p className="mt-0.5 font-mono text-xs text-zinc-500">
                          {field.fieldKey}
                        </p>
                      </td>
                      <td className="px-2 py-3">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.isShareable}
                            onChange={(e) =>
                              updateField(field.fieldKey, {
                                isShareable: e.target.checked,
                              })
                            }
                          />
                          <span>{field.isShareable ? t("shareYes") : t("shareNo")}</span>
                        </label>
                      </td>
                      <td className="px-2 py-3">
                        <select
                          value={field.minPrivacyLevel}
                          disabled={!field.isShareable}
                          onChange={(e) =>
                            updateField(field.fieldKey, {
                              minPrivacyLevel: Number(e.target.value),
                            })
                          }
                          className="field-input max-w-xs disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {t("levelOption", {
                                level,
                                label: tp(String(level)),
                              })}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={handleSave}
            className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
          >
            {saving ? tc("saving") : t("saveAll")}
          </button>
          {dirty && (
            <p className="text-sm text-amber-800">{t("unsavedChanges")}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900">{t("levelsGuideTitle")}</p>
        <ul className="mt-2 space-y-1">
          {LEVELS.map((level) => (
            <li key={level}>
              <span className="font-medium">Level {level}:</span> {tp(String(level))}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-zinc-600">{t("levelsGuideHint")}</p>
      </div>
    </div>
  );
}
