"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import type { DropdownMap } from "@/lib/api";
import { publicBrowseSearchHref } from "@/lib/public-browse";
import type { DiscoveryFilters } from "@/lib/discovery";

type PublicHomeSearchProps = {
  dropdowns: DropdownMap;
  compact?: boolean;
};

export function PublicHomeSearch({
  dropdowns,
  compact = false,
}: PublicHomeSearchProps) {
  const t = useTranslations("publicBrowse");
  const router = useRouter();
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [division, setDivision] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!gender) return;

    const filters: DiscoveryFilters = { gender };
    if (maritalStatus) filters.maritalStatus = maritalStatus;
    if (division) filters.division = division;

    router.push(publicBrowseSearchHref(filters));
  }

  const genderOptions = dropdowns.gender ?? [];
  const maritalOptions = dropdowns.marital_status ?? [];
  const divisionOptions = dropdowns.division ?? [];

  return (
    <form
      onSubmit={handleSubmit}
      className={
        compact
          ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          : "rounded-2xl border border-white/60 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-6"
      }
    >
      {!compact ? (
        <p className="mb-1 text-sm font-semibold text-rose-900 sm:col-span-full">
          {t("searchTitle")}
        </p>
      ) : null}
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-zinc-600">
          {t("lookingFor")}
        </span>
        <select
          required
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="field-input"
        >
          <option value="">{t("selectGender")}</option>
          {genderOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-zinc-600">
          {t("maritalStatus")}
        </span>
        <select
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
          className="field-input"
        >
          <option value="">{t("any")}</option>
          {maritalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-zinc-600">
          {t("division")}
        </span>
        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="field-input"
        >
          <option value="">{t("any")}</option>
          {divisionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className={compact ? "" : "sm:col-span-full"}>
        <button
          type="submit"
          disabled={!gender}
          className="w-full rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("browseProfiles")}
        </button>
      </div>
    </form>
  );
}
