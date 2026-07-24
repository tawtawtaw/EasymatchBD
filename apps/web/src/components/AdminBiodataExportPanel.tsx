"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DiscoveryFiltersPanel } from "@/components/DiscoveryFiltersPanel";
import { AUTH_TOKEN_KEY, DropdownMap, getDropdowns } from "@/lib/api";
import type { DiscoveryFilters } from "@/lib/discovery";
import { EMPTY_DISCOVERY_FILTERS } from "@/lib/discovery-filters";
import {
  downloadAdminBiodataCsv,
  triggerBlobDownload,
} from "@/lib/admin-biodata-export";

type AdminBiodataExportPanelProps = {
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
};

export function AdminBiodataExportPanel({
  onError,
  onMessage,
}: AdminBiodataExportPanelProps) {
  const locale = useLocale();
  const t = useTranslations("admin.biodataExport");
  const tc = useTranslations("common");
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(
    EMPTY_DISCOVERY_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<DiscoveryFilters>(
    EMPTY_DISCOVERY_FILTERS,
  );
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void getDropdowns(locale).then(setDropdowns).catch(() => undefined);
  }, [locale]);

  function applyFilters() {
    if (!draftFilters.gender) {
      onError(t("genderRequired"));
      onMessage(null);
      return;
    }
    setAppliedFilters(draftFilters);
    onError(null);
    onMessage(null);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_DISCOVERY_FILTERS);
    setAppliedFilters(EMPTY_DISCOVERY_FILTERS);
    onError(null);
    onMessage(null);
  }

  async function handleDownload() {
    const filters = appliedFilters.gender ? appliedFilters : draftFilters;
    if (!filters.gender) {
      onError(t("genderRequired"));
      onMessage(null);
      return;
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setDownloading(true);
    onError(null);
    onMessage(null);
    try {
      const result = await downloadAdminBiodataCsv(token, filters, locale);
      triggerBlobDownload(result.blob, result.filename);
      onMessage(
        result.truncated
          ? t("successTruncated", {
              count: result.rowCount,
              max: 5000,
            })
          : t("success", { count: result.rowCount }),
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("subtitle")}</p>
      </div>

      <DiscoveryFiltersPanel
        dropdowns={dropdowns}
        draft={draftFilters}
        applied={appliedFilters}
        expanded={filtersExpanded}
        onToggle={() => setFiltersExpanded((value) => !value)}
        onDraftChange={setDraftFilters}
        onApply={applyFilters}
        onClear={clearFilters}
        onUseMyPreferences={() => undefined}
        showGenderFilter
        hideUseMyPreferences
      />

      <div className="rounded-2xl border border-zinc-300 bg-white p-4 shadow-md">
        <p className="text-sm text-zinc-600">{t("downloadHint")}</p>
        <button
          type="button"
          disabled={downloading}
          onClick={() => void handleDownload()}
          className="mt-4 rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900 disabled:opacity-60"
        >
          {downloading ? t("downloading") : t("downloadCsv")}
        </button>
        {!appliedFilters.gender && !draftFilters.gender ? (
          <p className="mt-3 text-sm text-amber-800">{t("genderRequired")}</p>
        ) : null}
        <p className="mt-3 text-xs text-zinc-500">{t("privacyNote")}</p>
      </div>

      {dropdowns && Object.keys(dropdowns).length === 0 ? (
        <p className="text-sm text-zinc-500">{tc("loading")}</p>
      ) : null}
    </div>
  );
}
