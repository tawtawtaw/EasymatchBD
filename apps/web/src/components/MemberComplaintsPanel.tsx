"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { AUTH_TOKEN_KEY } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useRequireMember } from "@/hooks/use-require-member";
import { membershipFromSession } from "@/lib/membership";
import { isValidProfileCode, normalizeProfileCode } from "@easymatch/shared";
import {
  COMPLAINT_CATEGORIES,
  createMemberComplaint,
  listMemberComplaints,
  lookupComplaintTarget,
  type ComplaintTargetLookup,
  type MemberComplaintCategory,
  type MemberComplaintItem,
} from "@/lib/member-complaints";
function statusClass(status: string) {
  switch (status) {
    case "submitted":
      return "bg-amber-100 text-amber-900";
    case "assigned":
    case "in_progress":
      return "bg-blue-100 text-blue-900";
    case "resolved":
      return "bg-emerald-100 text-emerald-800";
    case "dismissed":
    case "cancelled":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

export function MemberComplaintsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("complaints");
  const tCommon = useTranslations("common");
  const { ready, isMember } = useRequireMember();
  const { user } = useAuthSession();
  const isPaid = membershipFromSession(user);

  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<MemberComplaintItem[]>([]);
  const [profileCode, setProfileCode] = useState("");
  const [category, setCategory] = useState<MemberComplaintCategory>("misrepresentation");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetLookup, setTargetLookup] = useState<ComplaintTargetLookup | null>(
    null,
  );
  const [lookupLoading, setLookupLoading] = useState(false);

  const canSubmitTarget =
    targetLookup?.found === true && targetLookup.isVerified === true;

  const load = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      router.replace("/auth");
      return;
    }
    try {
      const rows = await listMemberComplaints(token);
      setComplaints(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (!ready || !isMember) return;
    void load();
  }, [ready, isMember, load]);

  useEffect(() => {
    const prefill = searchParams.get("profileCode")?.replace(/\D/g, "").slice(0, 8);
    if (!prefill) return;
    setProfileCode(prefill);
    setShowForm(true);
  }, [searchParams]);

  useEffect(() => {
    if (!isPaid || !showForm) return;

    const normalized = normalizeProfileCode(profileCode);
    if (!isValidProfileCode(normalized)) {
      setTargetLookup(null);
      setLookupLoading(false);
      return;
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setLookupLoading(true);
    const timer = window.setTimeout(() => {
      lookupComplaintTarget(token, normalized)
        .then(setTargetLookup)
        .catch(() =>
          setTargetLookup({
            found: false,
            reason: "not_found",
          }),
        )
        .finally(() => setLookupLoading(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [profileCode, isPaid, showForm]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !canSubmitTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createMemberComplaint(token, {
        profileCode: normalizeProfileCode(profileCode),
        category,
        description: description.trim(),
      });
      setProfileCode("");
      setDescription("");
      setShowForm(false);
      router.push(`/complaints/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !isMember) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-zinc-600">{tCommon("loading")}</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="text-sm text-zinc-600">{t("subtitle")}</p>
        </header>

        {!isPaid ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm text-amber-900">{t("paidRequired")}</p>
            <Link
              href="/membership"
              className="mt-4 inline-flex rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
            >
              {t("upgradeMembership")}
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            {!showForm ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
              >
                {t("newComplaint")}
              </button>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-zinc-900">{t("formTitle")}</h2>
                <div>
                  <label htmlFor="profileCode" className="block text-sm font-medium text-zinc-700">
                    {t("profileCodeLabel")}
                  </label>
                  <input
                    id="profileCode"
                    value={profileCode}
                    onChange={(e) => {
                      setProfileCode(e.target.value.replace(/\D/g, "").slice(0, 8));
                      setError(null);
                    }}
                    inputMode="numeric"
                    pattern="[1-9][0-9]{7}"
                    maxLength={8}
                    required
                    placeholder={t("profileCodePlaceholder")}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-zinc-500">{t("profileCodeHint")}</p>
                  {lookupLoading ? (
                    <p className="mt-2 text-xs text-zinc-600">{t("profileLookupLoading")}</p>
                  ) : null}
                  {!lookupLoading && targetLookup?.found === true && targetLookup.isVerified ? (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                      {t("profileLookupVerified", {
                        code: targetLookup.profileCode,
                      })}
                    </p>
                  ) : null}
                  {!lookupLoading && targetLookup?.found === true && !targetLookup.isVerified ? (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
                      {t("profileLookupNotVerified", { code: targetLookup.profileCode })}
                    </p>
                  ) : null}
                  {!lookupLoading && targetLookup?.found === false && targetLookup.reason === "not_found" ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                      {t("profileLookupNotFound")}
                    </p>
                  ) : null}
                  {!lookupLoading && targetLookup?.found === false && targetLookup.reason === "self" ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                      {t("profileLookupSelf")}
                    </p>
                  ) : null}
                  {!lookupLoading &&
                  profileCode.length === 8 &&
                  targetLookup?.found === false &&
                  targetLookup.reason === "invalid" ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                      {t("profileLookupInvalid")}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-zinc-700">
                    {t("categoryLabel")}
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MemberComplaintCategory)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  >
                    {COMPLAINT_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {t(`categories.${value}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-zinc-700">
                    {t("descriptionLabel")}
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    minLength={20}
                    maxLength={4000}
                    rows={5}
                    placeholder={t("descriptionPlaceholder")}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={submitting || !canSubmitTarget}
                    className="rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
                  >
                    {submitting ? tCommon("loading") : t("submitComplaint")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {t("cancelForm")}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">{t("myComplaints")}</h2>
          {loading ? (
            <p className="text-sm text-zinc-600">{tCommon("loading")}</p>
          ) : complaints.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("emptyList")}</p>
          ) : (
            <ul className="space-y-3">
              {complaints.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/complaints/${item.id}`}
                    className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-rose-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-zinc-900">
                          {t("againstProfile", {
                            code: item.targetProfile?.profileCode ?? "—",
                          })}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {t(`categories.${item.category}`)} ·{" "}
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(item.status)}`}
                      >
                        {t(`status.${item.status}`)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
