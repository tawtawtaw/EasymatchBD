"use client";

import { useTranslations } from "next-intl";
import { formatExpectedKabinAmountRangeBdt, LIVING_ARRANGEMENTS_OTHER_MALE_VALUE } from "@easymatch/shared";
import type { DropdownMap } from "@/lib/api";
import {
  BiodataFieldRows,
  BiodataSectionShell,
} from "@/components/BiodataFieldRows";
import {
  createFieldOptionResolver,
  formatBiodataFieldValue,
} from "@/lib/biodata-display";
import type { MaritalAlignmentResult, MaritalAlignmentRow } from "@easymatch/shared";

const MARITAL_ALIGNMENT_FIELD: Record<
  MaritalAlignmentRow["key"],
  string
> = {
  expected_marriage_timeline: "expectedMarriageTimeline",
  expected_parenthood_timeline: "expectedParenthoodTimeline",
  wedding_ceremony_preference: "weddingCeremonyPreference",
  expected_kabin_amount: "expectedKabinAmountMinBdt",
  living_arrangements: "livingArrangements",
};

type MaritalAlignmentMatrixProps = {
  alignment: MaritalAlignmentResult;
  dropdowns: DropdownMap;
  locale: string;
  otherName: string;
};

const STATUS_DISPLAY_ORDER: Record<MaritalAlignmentRow["status"], number> = {
  match: 0,
  mismatch: 1,
  unknown: 2,
  not_set: 3,
  not_applicable: 4,
};

function criterionCardStyle(status: MaritalAlignmentRow["status"]) {
  switch (status) {
    case "match":
      return {
        border: "border-emerald-200",
        header: "from-emerald-800 to-emerald-700",
        badge: "bg-emerald-100 text-emerald-900",
      };
    case "mismatch":
      return {
        border: "border-red-200",
        header: "from-red-800 to-red-700",
        badge: "bg-red-100 text-red-900",
      };
    case "not_set":
      return {
        border: "border-amber-200",
        header: "from-amber-800 to-amber-700",
        badge: "bg-amber-100 text-amber-900",
      };
    default:
      return {
        border: "border-zinc-200",
        header: "from-zinc-700 to-zinc-600",
        badge: "bg-zinc-100 text-zinc-700",
      };
  }
}

export function MaritalAlignmentMatrix({
  alignment,
  dropdowns,
  locale,
  otherName,
}: MaritalAlignmentMatrixProps) {
  const t = useTranslations("comparison");
  const tf = useTranslations("profile.fields");
  const tb = useTranslations("biodataExport");

  const resolveStaticOption = createFieldOptionResolver((relativeKey) =>
    tf(relativeKey as never),
  );

  function formatValue(row: MaritalAlignmentRow, side: "viewer" | "other") {
    if (side === "viewer" ? row.viewerHidden : row.otherHidden) {
      return t("hidden");
    }

    if (row.key === "expected_kabin_amount") {
      const text = formatExpectedKabinAmountRangeBdt(
        side === "viewer" ? row.viewerKabinMin : row.otherKabinMin,
        side === "viewer" ? row.viewerKabinMax : row.otherKabinMax,
        locale,
      );
      return text ?? "—";
    }

    const raw = side === "viewer" ? row.viewerValue : row.otherValue;
    if (!raw) return "—";

    const gender =
      side === "viewer" ? alignment.viewerGender : alignment.otherGender;
    const livingOther =
      side === "viewer" ? row.viewerLivingOther : row.otherLivingOther;

    const label = formatBiodataFieldValue(MARITAL_ALIGNMENT_FIELD[row.key], raw, {
      locale,
      dropdowns,
      personal: { gender },
      resolveStaticOption,
      yesLabel: tb("yes"),
      noLabel: tb("no"),
    });

    if (
      row.key === "living_arrangements" &&
      raw === LIVING_ARRANGEMENTS_OTHER_MALE_VALUE &&
      livingOther
    ) {
      return `${label} (${livingOther})`;
    }

    return label;
  }

  if (alignment.totalCriteria === 0) {
    return (
      <BiodataSectionShell title={t("maritalAlignmentTitle")} theme="violet">
        <p className="text-sm text-zinc-600">{t("maritalAlignmentNoCriteria")}</p>
      </BiodataSectionShell>
    );
  }

  const visibleRows = alignment.rows
    .filter((row) => row.status !== "not_applicable")
    .sort(
      (a, b) => STATUS_DISPLAY_ORDER[a.status] - STATUS_DISPLAY_ORDER[b.status],
    );

  return (
    <BiodataSectionShell title={t("maritalAlignmentTitle")} theme="violet">
      <p className="mb-4 text-sm text-zinc-600">
        {t("maritalAlignmentSubtitle", { other: otherName })}
      </p>
      <div className="mb-4 rounded-lg border border-violet-100 bg-violet-50 px-4 py-3">
        <p className="text-sm font-semibold text-violet-950">
          {t("maritalAlignmentScore", {
            score: alignment.score,
            matched: alignment.matchedCount,
            total: alignment.totalCriteria,
          })}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {visibleRows.map((row) => {
          const card = criterionCardStyle(row.status);

          return (
            <article
              key={row.key}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm ${card.border}`}
            >
              <div
                className={`flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r px-4 py-2.5 ${card.header}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wide text-white sm:text-base">
                  {t(`maritalCriteria.${row.key}`)}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${card.badge}`}
                >
                  {t(`status.${row.status}`)}
                </span>
              </div>

              <div className="space-y-2 p-3 sm:p-4">
                <BiodataFieldRows
                  theme="sky"
                  rows={[
                    {
                      key: "viewer",
                      label: t("yourValue"),
                      value: formatValue(row, "viewer"),
                    },
                  ]}
                />
                <BiodataFieldRows
                  theme="rose"
                  rows={[
                    {
                      key: "other",
                      label: t("theirValue"),
                      value: formatValue(row, "other"),
                    },
                  ]}
                />
              </div>
            </article>
          );
        })}
      </div>
    </BiodataSectionShell>
  );
}
