"use client";

import { useTranslations } from "next-intl";
import {
  isAllBangladeshDistrictsPreferenceText,
  isAnyReligionPreferenceText,
} from "@easymatch/shared";
import type { DropdownMap } from "@/lib/api";
import {
  BiodataFieldRows,
  BiodataSectionShell,
} from "@/components/BiodataFieldRows";
import {
  createFieldOptionResolver,
  formatBiodataFieldValue,
} from "@/lib/biodata-display";
import type {
  ComparisonCriterionKey,
  ComparisonDirectionResult,
  ComparisonRow,
} from "@/lib/comparison";
import {
  COMPARISON_ATTRIBUTE_FIELD,
  COMPARISON_PREFERENCE_FIELD,
} from "@/lib/comparison";

type ComparisonMatrixProps = {
  direction: ComparisonDirectionResult;
  mode: "viewerToOther" | "otherToViewer";
  dropdowns: DropdownMap;
  locale: string;
  unavailableMessage?: string;
};

const STATUS_DISPLAY_ORDER: Record<ComparisonRow["status"], number> = {
  match: 0,
  mismatch: 1,
  unknown: 2,
  not_set: 3,
  not_applicable: 4,
};

function criterionCardStyle(status: ComparisonRow["status"]) {
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
    case "unknown":
      return {
        border: "border-zinc-200",
        header: "from-zinc-700 to-zinc-600",
        badge: "bg-zinc-100 text-zinc-700",
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
        badge: "bg-zinc-100 text-zinc-600",
      };
  }
}

export function ComparisonMatrix({
  direction,
  mode,
  dropdowns,
  locale,
  unavailableMessage,
}: ComparisonMatrixProps) {
  const t = useTranslations("comparison");
  const tf = useTranslations("profile.fields");
  const tb = useTranslations("biodataExport");

  const resolveStaticOption = createFieldOptionResolver((relativeKey) =>
    tf(relativeKey as never),
  );

  function formatCode(fieldKey: string, code: string) {
    return formatBiodataFieldValue(fieldKey, code.trim(), {
      locale,
      dropdowns,
      resolveStaticOption,
      yesLabel: tb("yes"),
      noLabel: tb("no"),
    });
  }

  /**
   * Multi-select preferences such as marital status and profession arrive as one
   * comma-joined string of raw codes, and looking that whole string up never
   * matches an option, so each code has to be resolved on its own.
   */
  function formatCodeList(fieldKey: string, value: string) {
    return value
      .split(",")
      .map((code) => formatCode(fieldKey, code))
      .join(", ");
  }

  function formatCell(
    key: ComparisonCriterionKey,
    value: string | null,
    side: "expectation" | "attribute",
  ) {
    if (!value) return "—";

    if (key === "district") {
      if (side === "expectation" && isAllBangladeshDistrictsPreferenceText(value)) {
        return tf("allDistrictsOfBangladesh");
      }
      return formatCodeList("current_district", value);
    }

    if (key === "religion") {
      if (side === "expectation" && isAnyReligionPreferenceText(value)) {
        return tf("anyReligion");
      }
      return formatCode("religion", value);
    }

    const fieldKey =
      side === "expectation"
        ? COMPARISON_PREFERENCE_FIELD[key]
        : COMPARISON_ATTRIBUTE_FIELD[key];

    if (key === "age" && side === "attribute") {
      return value;
    }

    return formatCodeList(fieldKey, value);
  }

  if (!direction.available) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {unavailableMessage ?? t("otherPreferencesHidden")}
      </div>
    );
  }

  if (direction.totalCriteria === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        {t("noCriteria")}
      </div>
    );
  }

  const directionTitle =
    mode === "viewerToOther"
      ? t("viewerToOtherTitle")
      : t("otherToViewerTitle");

  const attributeLabel =
    mode === "otherToViewer" ? t("yourValue") : t("theirValue");

  const visibleRows = direction.rows
    .filter((row) => row.status !== "not_applicable")
    .sort(
      (a, b) => STATUS_DISPLAY_ORDER[a.status] - STATUS_DISPLAY_ORDER[b.status],
    );

  return (
    <BiodataSectionShell title={directionTitle} theme="rose">
      <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3">
        <p className="text-sm font-semibold text-rose-950">
          {t("directionScore", {
            score: direction.score,
            matched: direction.matchedCount,
            total: direction.totalCriteria,
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
                  {t(`criteria.${row.key}`)}
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
                      key: "expectation",
                      label: t("expectation"),
                      value: row.expectationHidden
                        ? t("hidden")
                        : formatCell(
                            row.key,
                            row.expectationValue,
                            "expectation",
                          ),
                    },
                  ]}
                />
                <BiodataFieldRows
                  theme="rose"
                  rows={[
                    {
                      key: "attribute",
                      label: attributeLabel,
                      value: row.attributeHidden
                        ? t("hidden")
                        : formatCell(
                            row.key,
                            row.attributeValue,
                            "attribute",
                          ),
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
