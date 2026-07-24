"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { DiscoveryFiltersPanel } from "@/components/DiscoveryFiltersPanel";
import { PublicBrowseProfileCard } from "@/components/PublicBrowseProfileCard";
import { DropdownMap, getDropdowns } from "@/lib/api";
import { useMounted } from "@/hooks/use-mounted";
import type { DiscoveryFilters } from "@/lib/discovery";
import { EMPTY_DISCOVERY_FILTERS } from "@/lib/discovery-filters";
import {
  filtersFromSearchParams,
  searchParamsFromFilters,
} from "@/lib/public-browse-filters";
import {
  listPublicProfiles,
  type PublicBrowseListItem,
} from "@/lib/public-browse";

export default function PublicBrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("publicBrowse");
  const mounted = useMounted();
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(
    EMPTY_DISCOVERY_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<DiscoveryFilters>(
    EMPTY_DISCOVERY_FILTERS,
  );
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [items, setItems] = useState<PublicBrowseListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    const next = filtersFromSearchParams(
      new URLSearchParams(searchParams.toString()),
    );
    setDraftFilters(next);
    setAppliedFilters(next);
    setInitialized(true);
  }, [mounted, searchParams]);

  useEffect(() => {
    if (!mounted) return;
    void getDropdowns(locale).then(setDropdowns).catch(() => undefined);
  }, [mounted, locale]);

  const loadProfiles = useCallback(async (filters: DiscoveryFilters) => {
    if (!filters.gender) {
      setItems([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await listPublicProfiles(filters);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!initialized) return;
    void loadProfiles(appliedFilters);
  }, [appliedFilters, initialized, loadProfiles]);

  function applyFilters() {
    if (!draftFilters.gender) {
      setError(t("genderRequired"));
      return;
    }
    const params = searchParamsFromFilters(draftFilters);
    router.replace(params.toString() ? `/browse?${params.toString()}` : "/browse");
    setAppliedFilters(draftFilters);
    setError(null);
  }

  if (!mounted) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-zinc-600">{t("loading")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="max-w-3xl text-zinc-600">{t("subtitle")}</p>
        <p className="text-sm font-medium text-amber-900">{t("privacyNote")}</p>
      </div>

      <DiscoveryFiltersPanel
        dropdowns={dropdowns}
        draft={draftFilters}
        applied={appliedFilters}
        expanded={filtersExpanded}
        onToggle={() => setFiltersExpanded((value) => !value)}
        onDraftChange={setDraftFilters}
        onApply={applyFilters}
        onClear={() => {
          setDraftFilters({ gender: draftFilters.gender });
          setAppliedFilters({ gender: appliedFilters.gender });
          const params = searchParamsFromFilters({
            gender: appliedFilters.gender,
          });
          router.replace(
            params.toString() ? `/browse?${params.toString()}` : "/browse",
          );
        }}
        onUseMyPreferences={() => undefined}
        showGenderFilter
        hideUseMyPreferences
      />

      {!appliedFilters.gender ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-950">
          {t("pickGenderPrompt")}
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-zinc-600">{t("loading")}</p>
      ) : appliedFilters.gender && items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center shadow-sm">
          <p className="text-zinc-600">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <PublicBrowseProfileCard
              key={item.profileId}
              item={item}
              dropdowns={dropdowns}
            />
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50 px-5 py-6">
        <h2 className="text-lg font-bold text-rose-950">{t("ctaTitle")}</h2>
        <p className="mt-2 text-sm text-rose-900/90">{t("ctaBody")}</p>
        <Link
          href="/auth"
          className="mt-4 inline-flex rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </main>
  );
}
