"use client";

import { useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY, getMe } from "@/lib/api";
import { AdminPrivacyFieldsPanel } from "@/components/AdminPrivacyFieldsPanel";
import { AdminLegalPanel } from "@/components/AdminLegalPanel";
import { AdminProfilesPanel } from "@/components/AdminProfilesPanel";
import { AdminBiodataExportPanel } from "@/components/AdminBiodataExportPanel";
import { AdminProfileDeletionsPanel } from "@/components/AdminProfileDeletionsPanel";
import { AdminInterestsPanel } from "@/components/AdminInterestsPanel";
import { AdminPaymentsPanel } from "@/components/AdminPaymentsPanel";
import { AdminTariffsPanel } from "@/components/AdminTariffsPanel";
import { AdminConsultantTariffsPanel } from "@/components/AdminConsultantTariffsPanel";
import { AdminMarketingBannerPanel } from "@/components/AdminMarketingBannerPanel";
import {
  createDropdownOption,
  deleteDropdownOption,
  getAdminDropdownOptions,
  getDropdownCategories,
  canViewAdminProfiles,
  isSuperAdminRole,
  updateDropdownOption,
  type DropdownOption,
} from "@/lib/admin";

type AdminTab =
  | "dropdowns"
  | "privacy"
  | "legal"
  | "banner"
  | "tariffs"
  | "consultantTariffs"
  | "payments"
  | "profiles"
  | "biodataExport"
  | "interests"
  | "deletions";

type NewOptionForm = {
  value: string;
  label: string;
  labelBn: string;
  sortOrder: string;
};

const emptyNewForm = (): NewOptionForm => ({
  value: "",
  label: "",
  labelBn: "",
  sortOrder: "",
});

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [activeTab, setActiveTab] = useState<AdminTab>("dropdowns");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [fullAdmin, setFullAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    label: "",
    labelBn: "",
    sortOrder: "",
    isActive: true,
  });
  const [newForm, setNewForm] = useState<NewOptionForm>(emptyNewForm);

  const loadOptions = useCallback(async (category: string) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    const items = await getAdminDropdownOptions(token, category);
    setOptions(items);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }

    getMe(token)
      .then(async (user) => {
        if (!canViewAdminProfiles(user.role)) {
          setAuthorized(false);
          return;
        }
        const superAdmin = isSuperAdminRole(user.role);
        setAuthorized(true);
        setFullAdmin(superAdmin);
        setCurrentUserId(user.id);
        if (!superAdmin) {
          setActiveTab("profiles");
          return;
        }
        const cats = await getDropdownCategories(token);
        const categoryList = cats.map((item) => item.category);
        setCategories(categoryList);
        if (categoryList.length > 0) {
          setSelectedCategory(categoryList[0]);
          await loadOptions(categoryList[0]);
        }
      })
      .catch(() => router.replace("/auth"))
      .finally(() => setLoading(false));
  }, [router, loadOptions]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const validTabs: AdminTab[] = [
      "dropdowns",
      "privacy",
      "legal",
      "banner",
      "tariffs",
      "consultantTariffs",
      "payments",
      "profiles",
      "biodataExport",
      "interests",
      "deletions",
    ];
    if (tab && validTabs.includes(tab as AdminTab)) {
      setActiveTab(tab as AdminTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedCategory || !authorized) return;
    loadOptions(selectedCategory).catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load"),
    );
  }, [selectedCategory, authorized, loadOptions]);

  function startEdit(option: DropdownOption) {
    setEditingId(option.id);
    setEditForm({
      label: option.label,
      labelBn: option.labelBn ?? "",
      sortOrder: String(option.sortOrder),
      isActive: option.isActive,
    });
    setMessage(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(optionId: string) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !selectedCategory) return;

    setActing(optionId);
    setError(null);
    try {
      await updateDropdownOption(token, optionId, {
        label: editForm.label.trim(),
        labelBn: editForm.labelBn.trim() || undefined,
        sortOrder: Number(editForm.sortOrder),
        isActive: editForm.isActive,
      });
      setMessage(t("optionUpdated"));
      setEditingId(null);
      await loadOptions(selectedCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActing(null);
    }
  }

  async function handleToggleActive(option: DropdownOption) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !selectedCategory) return;

    setActing(option.id);
    setError(null);
    try {
      await updateDropdownOption(token, option.id, {
        isActive: !option.isActive,
      });
      setMessage(option.isActive ? t("optionDeactivated") : t("optionActivated"));
      await loadOptions(selectedCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActing(null);
    }
  }

  async function handleDelete(option: DropdownOption) {
    if (!window.confirm(t("confirmDelete", { label: option.label }))) return;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !selectedCategory) return;

    setActing(option.id);
    setError(null);
    try {
      await deleteDropdownOption(token, option.id);
      setMessage(t("optionDeleted"));
      await loadOptions(selectedCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActing(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !selectedCategory) return;

    setActing("create");
    setError(null);
    try {
      await createDropdownOption(token, {
        category: selectedCategory,
        value: newForm.value.trim(),
        label: newForm.label.trim(),
        labelBn: newForm.labelBn.trim() || undefined,
        sortOrder: newForm.sortOrder ? Number(newForm.sortOrder) : undefined,
      });
      setMessage(t("optionCreated"));
      setNewForm(emptyNewForm());
      await loadOptions(selectedCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setActing(null);
    }
  }

  function categoryLabel(category: string) {
    return t.has(`categories.${category}`)
      ? t(`categories.${category}`)
      : category;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-700">
        {tc("loading")}
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold text-zinc-900">{t("accessDenied")}</p>
        <p className="max-w-md text-sm text-zinc-600">{t("accessDeniedHint")}</p>
        <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
          {tc("home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/admin/home" className="text-sm font-medium text-rose-700 hover:underline">
            {tc("home")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="text-sm text-zinc-600">{t("subtitle")}</p>
        </div>

        {message && (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="flex gap-2 border-b-2 border-zinc-300">
          {(
            fullAdmin
              ? ([
                  "dropdowns",
                  "privacy",
                  "legal",
                  "banner",
                  "tariffs",
                  "consultantTariffs",
                  "payments",
                  "profiles",
                  "biodataExport",
                  "interests",
                  "deletions",
                ] as AdminTab[])
              : (["profiles", "interests"] as AdminTab[])
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setMessage(null);
                setError(null);
              }}
              className={`px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab
                  ? "border-b-2 border-rose-700 text-rose-800 -mb-0.5"
                  : "text-zinc-700 hover:text-zinc-950"
              }`}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === "interests" ? (
          <AdminInterestsPanel onError={setError} />
        ) : activeTab === "deletions" ? (
          <AdminProfileDeletionsPanel onError={setError} onMessage={setMessage} />
        ) : activeTab === "profiles" ? (
          <AdminProfilesPanel
            onError={setError}
            onMessage={setMessage}
            onGoToDeletions={() => {
              setActiveTab("deletions");
              setError(null);
            }}
            canRequestDeletion={fullAdmin}
            canManageMembership={fullAdmin}
            currentUserId={currentUserId}
          />
        ) : activeTab === "biodataExport" ? (
          <AdminBiodataExportPanel onError={setError} onMessage={setMessage} />
        ) : activeTab === "legal" ? (
          <AdminLegalPanel onError={setError} onMessage={setMessage} />
        ) : activeTab === "banner" ? (
          <AdminMarketingBannerPanel onError={setError} onMessage={setMessage} />
        ) : activeTab === "privacy" ? (
          <AdminPrivacyFieldsPanel onError={setError} onMessage={setMessage} />
        ) : activeTab === "tariffs" ? (
          <AdminTariffsPanel onError={setError} onMessage={setMessage} />
        ) : activeTab === "consultantTariffs" ? (
          <AdminConsultantTariffsPanel onError={setError} onMessage={setMessage} />
        ) : activeTab === "payments" ? (
          <AdminPaymentsPanel onError={setError} defaultFilter="validated" />
        ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-zinc-300 bg-white p-4 shadow-md">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">
              {t("categoriesTitle")}
            </h2>
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category);
                      setEditingId(null);
                      setMessage(null);
                      setError(null);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      selectedCategory === category
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {categoryLabel(category)}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <main className="space-y-6">
            <section className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-zinc-900">
                  {selectedCategory ? categoryLabel(selectedCategory) : t("optionsTitle")}
                </h2>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                  {t("optionCount", { count: options.length })}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">{t("optionsHint")}</p>

              {options.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600">{t("emptyCategory")}</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs font-bold uppercase tracking-wide text-zinc-500">
                        <th className="px-2 py-2">{t("columns.value")}</th>
                        <th className="px-2 py-2">{t("columns.labelEn")}</th>
                        <th className="px-2 py-2">{t("columns.labelBn")}</th>
                        <th className="px-2 py-2">{t("columns.order")}</th>
                        <th className="px-2 py-2">{t("columns.status")}</th>
                        <th className="px-2 py-2">{t("columns.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {options.map((option) => {
                        const isEditing = editingId === option.id;
                        return (
                          <tr
                            key={option.id}
                            className="border-b border-zinc-100 align-top"
                          >
                            <td className="px-2 py-3 font-mono text-xs text-zinc-700">
                              {option.value}
                              {option.isSystem && (
                                <span className="ml-1 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-700">
                                  {t("systemBadge")}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              {isEditing ? (
                                <input
                                  value={editForm.label}
                                  onChange={(e) =>
                                    setEditForm((f) => ({ ...f, label: e.target.value }))
                                  }
                                  className="field-input"
                                />
                              ) : (
                                option.label
                              )}
                            </td>
                            <td className="px-2 py-3">
                              {isEditing ? (
                                <input
                                  value={editForm.labelBn}
                                  onChange={(e) =>
                                    setEditForm((f) => ({ ...f, labelBn: e.target.value }))
                                  }
                                  className="field-input"
                                />
                              ) : (
                                option.labelBn || "—"
                              )}
                            </td>
                            <td className="px-2 py-3">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={editForm.sortOrder}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      sortOrder: e.target.value,
                                    }))
                                  }
                                  className="field-input w-20"
                                />
                              ) : (
                                option.sortOrder
                              )}
                            </td>
                            <td className="px-2 py-3">
                              {isEditing ? (
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={editForm.isActive}
                                    onChange={(e) =>
                                      setEditForm((f) => ({
                                        ...f,
                                        isActive: e.target.checked,
                                      }))
                                    }
                                  />
                                  {t("active")}
                                </label>
                              ) : (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    option.isActive
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-zinc-200 text-zinc-700"
                                  }`}
                                >
                                  {option.isActive ? t("active") : t("inactive")}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex flex-wrap gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={acting === option.id}
                                      onClick={() => handleSaveEdit(option.id)}
                                      className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                                    >
                                      {tc("save")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEdit}
                                      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                                    >
                                      {t("cancel")}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(option)}
                                      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                                    >
                                      {t("edit")}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={acting === option.id}
                                      onClick={() => handleToggleActive(option)}
                                      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                                    >
                                      {option.isActive ? t("deactivate") : t("activate")}
                                    </button>
                                    {!option.isSystem && (
                                      <button
                                        type="button"
                                        disabled={acting === option.id}
                                        onClick={() => handleDelete(option)}
                                        className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                      >
                                        {t("delete")}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
              <h3 className="text-lg font-bold text-zinc-900">{t("addTitle")}</h3>
              <p className="mt-1 text-sm text-zinc-600">{t("addHint")}</p>
              <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="field-label">{t("fields.value")}</span>
                  <input
                    required
                    value={newForm.value}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, value: e.target.value }))
                    }
                    placeholder={t("fields.valuePlaceholder")}
                    className="field-input"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="field-label">{t("fields.labelEn")}</span>
                  <input
                    required
                    value={newForm.label}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, label: e.target.value }))
                    }
                    className="field-input"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="field-label">{t("fields.labelBn")}</span>
                  <input
                    value={newForm.labelBn}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, labelBn: e.target.value }))
                    }
                    className="field-input"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="field-label">{t("fields.sortOrder")}</span>
                  <input
                    type="number"
                    min={0}
                    value={newForm.sortOrder}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, sortOrder: e.target.value }))
                    }
                    placeholder={t("fields.sortOrderAuto")}
                    className="field-input"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={acting === "create" || !selectedCategory}
                    className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                  >
                    {acting === "create" ? tc("saving") : t("addOption")}
                  </button>
                </div>
              </form>
            </section>
          </main>
        </div>
        )}
      </div>
    </div>
  );
}
