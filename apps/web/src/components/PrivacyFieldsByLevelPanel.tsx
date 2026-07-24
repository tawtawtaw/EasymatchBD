import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  fieldsNewAtTechnicalLevel,
  fieldsVisibleAtTechnicalLevel,
  getPrivacyFieldRules,
  groupPrivacyFieldsBySection,
  PRIVACY_DISPLAY_LEVELS,
} from "@/lib/privacy-fields";
import { humanizeFieldKey } from "@/lib/biodata-display";

export async function PrivacyFieldsByLevelPanel() {
  const [t, tPublic, tAdmin, fields] = await Promise.all([
    getTranslations("privacyFieldsPage"),
    getTranslations("publicHome"),
    getTranslations("admin.privacyFields"),
    getPrivacyFieldRules(),
  ]);

  const fieldLabels = tAdmin.raw("fields") as Record<string, string>;

  function fieldLabel(fieldKey: string) {
    return fieldLabels[fieldKey] ?? humanizeFieldKey(fieldKey);
  }

  function sectionLabel(section: string) {
    try {
      return tAdmin(`sections.${section}` as "sections.personal");
    } catch {
      return humanizeFieldKey(section);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
          {t("backHome")}
        </Link>

        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="text-base leading-relaxed text-zinc-600">{t("intro")}</p>
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {t("cumulativeNote")}
          </p>
        </header>

        <div className="space-y-10">
          {PRIVACY_DISPLAY_LEVELS.map(({ displayLevel, technicalLevel }) => {
            const visible = fieldsVisibleAtTechnicalLevel(fields, technicalLevel);
            const newlyUnlocked = fieldsNewAtTechnicalLevel(fields, technicalLevel);
            const grouped = groupPrivacyFieldsBySection(visible);
            const levelLabel = tPublic(
              `privacyLevels.items.${displayLevel}.label` as "privacyLevels.items.1.label",
            );

            return (
              <section
                key={displayLevel}
                id={`level-${displayLevel}`}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-4 border-b border-zinc-100 pb-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                    {displayLevel}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      {tPublic("privacyLevels.levelLabel", { level: displayLevel })}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-zinc-900">{levelLabel}</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {t("fieldCount", { count: visible.length })}
                      {newlyUnlocked.length > 0
                        ? ` · ${t("newAtLevel", { count: newlyUnlocked.length })}`
                        : null}
                    </p>
                  </div>
                </div>

                {grouped.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {grouped.map(({ section, fields: sectionFields }) => (
                      <div key={section}>
                        <h3 className="text-sm font-semibold text-zinc-800">
                          {sectionLabel(section)}
                        </h3>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {sectionFields.map((field) => {
                            const isNew = field.minPrivacyLevel === technicalLevel;
                            return (
                              <li
                                key={field.fieldKey}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  isNew
                                    ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                                    : "border border-zinc-200 bg-zinc-50 text-zinc-700"
                                }`}
                              >
                                {fieldLabel(field.fieldKey)}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">{t("noFields")}</p>
                )}
              </section>
            );
          })}
        </div>

        <p className="text-sm text-zinc-500">{t("footerNote")}</p>

        <Link
          href="/privacy"
          className="inline-flex rounded-full border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-50"
        >
          {t("privacyPolicyLink")}
        </Link>
      </div>
    </div>
  );
}
