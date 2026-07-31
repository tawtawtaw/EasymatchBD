"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AuthenticatedBlobImage } from "@/components/AuthenticatedBlobImage";
import { VerificationProfileDetails } from "@/components/VerificationProfileDetails";
import { VerificationAuditBiodataPdfButton } from "@/components/VerificationAuditBiodataPdfButton";
import { AUTH_TOKEN_KEY, DropdownMap, getDropdowns } from "@/lib/api";
import {
  getAdminMemberProfile,
  getAdminStaffProfile,
  listAdminProfiles,
  type AdminProfileKind,
  type AdminProfileListItem,
  type AdminStaffProfileDetail,
} from "@/lib/admin-profiles";
import { createProfileDeletionRequest, listProfileDeletionRequests } from "@/lib/admin-profile-deletions";
import { AdminMemberMembershipControls } from "@/components/AdminMemberMembershipControls";
import {
  fetchVerificationBlob,
  officerPhotoUrl,
  type VerificationSubmission,
} from "@/lib/verification";

type AdminProfilesPanelProps = {
  onError: (message: string | null) => void;
  onMessage?: (message: string | null) => void;
  onGoToDeletions?: () => void;
  canRequestDeletion?: boolean;
  canManageMembership?: boolean;
  currentUserId?: string | null;
};

function display(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

function statusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export function AdminProfilesPanel({
  onError,
  onMessage,
  onGoToDeletions,
  canRequestDeletion = false,
  canManageMembership = false,
  currentUserId = null,
}: AdminProfilesPanelProps) {
  const t = useTranslations("admin.profiles");
  const ts = useTranslations("staffProfile.fields");
  const tv = useTranslations("verification");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [dropdowns, setDropdowns] = useState<DropdownMap>({});

  const [items, setItems] = useState<AdminProfileListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<AdminProfileKind | "all">("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selected, setSelected] = useState<AdminProfileListItem | null>(null);
  const [memberDetail, setMemberDetail] = useState<VerificationSubmission | null>(null);
  const [staffDetail, setStaffDetail] = useState<AdminStaffProfileDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletionFeedback, setDeletionFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pendingDeletionUserIds, setPendingDeletionUserIds] = useState<
    Set<string>
  >(new Set());
  const [showDeleted, setShowDeleted] = useState(false);

  function updateSelectedMembership(userId: string, plan: string, isPaid: boolean) {
    setItems((prev) =>
      prev.map((item) =>
        item.userId === userId
          ? { ...item, subscriptionPlan: plan, isPaidMember: isPaid }
          : item,
      ),
    );
    setSelected((prev) =>
      prev?.userId === userId
        ? { ...prev, subscriptionPlan: plan, isPaidMember: isPaid }
        : prev,
    );
  }

  const loadPendingDeletions = useCallback(async () => {
    if (!canRequestDeletion) return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    try {
      const pending = await listProfileDeletionRequests(token, "pending");
      setPendingDeletionUserIds(
        new Set(
          pending
            .filter((request) => request.target.isActive)
            .map((request) => request.target.userId),
        ),
      );
    } catch {
      // Non-blocking; form still works if this fails.
    }
  }, [canRequestDeletion]);

  useEffect(() => {
    void loadPendingDeletions();
  }, [loadPendingDeletions]);

  useEffect(() => {
    void getDropdowns(locale).then(setDropdowns).catch(() => undefined);
  }, [locale]);

  const loadList = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setLoading(true);
    onError(null);
    try {
      const data = await listAdminProfiles(token, {
        page,
        limit: 25,
        q: appliedSearch || undefined,
        kind,
        includeInactive: canRequestDeletion && showDeleted,
      });
      setItems(data.items);
      setTotal(data.total);
      setSelected((current) => {
        if (!current) return null;
        const stillVisible = data.items.some(
          (item) => item.userId === current.userId,
        );
        if (stillVisible) return current;
        setMemberDetail(null);
        setStaffDetail(null);
        return null;
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, canRequestDeletion, kind, onError, page, showDeleted]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadDetail = useCallback(
    async (item: AdminProfileListItem) => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      setSelected(item);
      setMemberDetail(null);
      setStaffDetail(null);
      setDetailLoading(true);
      setDeletionFeedback(null);
      setDeleteConfirming(false);
      setDeleteReason("");
      onError(null);

      try {
        if (item.kind === "member" && item.profileId) {
          setMemberDetail(await getAdminMemberProfile(token, item.profileId));
        } else if (item.kind === "staff") {
          setStaffDetail(await getAdminStaffProfile(token, item.userId));
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to load profile");
        setSelected(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [onError],
  );

  const totalPages = Math.max(1, Math.ceil(total / 25));

  const canDeleteSelected =
    canRequestDeletion &&
    selected?.isActive &&
    currentUserId !== null &&
    selected.userId !== currentUserId;

  const hasPendingDeletion =
    selected != null && pendingDeletionUserIds.has(selected.userId);

  async function handleRequestDeletion() {
    if (!selected) return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setDeleteSubmitting(true);
    setDeletionFeedback(null);
    onError(null);
    onMessage?.(null);
    try {
      await createProfileDeletionRequest(
        token,
        selected.userId,
        deleteReason.trim() || undefined,
      );
      setDeleteConfirming(false);
      setDeleteReason("");
      setPendingDeletionUserIds((current) => {
        const next = new Set(current);
        next.add(selected.userId);
        return next;
      });
      const successText = t("deletionRequested");
      setDeletionFeedback({ type: "success", text: successText });
      onMessage?.(successText);
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : t("deletionRequestFailed");
      setDeletionFeedback({ type: "error", text: errorText });
      onError(errorText);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function renderDeletionRequest() {
    if (!canRequestDeletion || !selected?.isActive) return null;

    if (currentUserId !== null && selected.userId === currentUserId) {
      return (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm text-zinc-600">{t("cannotDeleteSelf")}</p>
        </section>
      );
    }

    if (hasPendingDeletion) {
      return (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {t("deletionPending")}
          </p>
          <p className="mt-1 text-xs text-amber-800">{t("deletionPendingHint")}</p>
          {onGoToDeletions ? (
            <button
              type="button"
              onClick={onGoToDeletions}
              className="mt-3 rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-900"
            >
              {t("viewDeletionQueue")}
            </button>
          ) : null}
        </section>
      );
    }

    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-4">
        <h3 className="text-sm font-bold text-red-900">{t("requestDeletionTitle")}</h3>
        <p className="mt-1 text-xs text-red-800">{t("requestDeletionHint")}</p>

        {deletionFeedback ? (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              deletionFeedback.type === "success"
                ? "bg-emerald-100 text-emerald-900"
                : "bg-red-100 text-red-900"
            }`}
          >
            {deletionFeedback.text}
          </p>
        ) : null}

        {deletionFeedback?.type === "success" && onGoToDeletions ? (
          <button
            type="button"
            onClick={onGoToDeletions}
            className="mt-3 rounded-lg bg-rose-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-900"
          >
            {t("viewDeletionQueue")}
          </button>
        ) : null}

        {!deletionFeedback || deletionFeedback.type === "error" ? (
          !deleteConfirming ? (
            <button
              type="button"
              onClick={() => {
                setDeleteConfirming(true);
                setDeletionFeedback(null);
              }}
              className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-900 hover:bg-red-100"
            >
              {t("requestDeletion")}
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder={t("deletionReasonPlaceholder")}
                className="field-input min-h-[80px] w-full"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={() => void handleRequestDeletion()}
                  className="rounded-lg bg-red-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-900 disabled:opacity-60"
                >
                  {deleteSubmitting
                    ? t("submittingDeletionRequest")
                    : t("confirmDeletionRequest")}
                </button>
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={() => {
                    setDeleteConfirming(false);
                    setDeleteReason("");
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          )
        ) : null}
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="min-w-0 rounded-2xl border border-zinc-300 bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{t("title")}</h2>
            <p className="text-sm text-zinc-600">{t("hint")}</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
            {t("count", { count: total })}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "member", "staff"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setKind(value);
                setPage(1);
                setSelected(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                kind === value
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {t(`filters.${value}`)}
            </button>
          ))}
        </div>

        {canRequestDeletion ? (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => {
                setShowDeleted(e.target.checked);
                setPage(1);
                setSelected(null);
                setMemberDetail(null);
                setStaffDetail(null);
              }}
              className="rounded border-zinc-300"
            />
            {t("showDeletedAccounts")}
          </label>
        ) : null}

        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setAppliedSearch(search.trim());
            setSelected(null);
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="field-input min-w-[220px] flex-1"
          />
          <button
            type="submit"
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
          >
            {t("search")}
          </button>
        </form>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-600">{tc("loading")}</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-600">{t("empty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {items.map((item) => (
              <li key={item.userId}>
                <button
                  type="button"
                  onClick={() => void loadDetail(item)}
                  className={`w-full px-2 py-3 text-left transition hover:bg-zinc-50 ${
                    selected?.userId === item.userId ? "bg-rose-50" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-900">
                      {display(item.fullName) || t("unnamed")}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        item.kind === "staff"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {t(`kind.${item.kind}`)}
                    </span>
                    {!item.isActive ? (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-700">
                        {t("deleted")}
                      </span>
                    ) : null}
                    {item.kind === "member" && item.subscriptionPlan ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.isPaidMember
                            ? "bg-amber-100 text-amber-900"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {item.subscriptionPlan}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    {t("roleLabel", { role: t(`roles.${item.role}` as "roles.individual") })}
                    {item.profileCode ? ` · ${t("profileCode", { code: item.profileCode })}` : ""}
                  </p>
                  <p className="text-xs font-medium text-zinc-700">
                    {item.kind === "staff"
                      ? t("loginEmail", { value: display(item.email) })
                      : t("loginPhone", { value: display(item.phone) })}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.kind === "member" && item.isVerified !== null
                      ? item.isVerified ? t("verified") : t("notVerified")
                      : null}
                    {item.kind === "staff" && item.designation
                      ? item.designation
                      : null}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 disabled:opacity-50"
            >
              {t("prevPage")}
            </button>
            <span className="text-xs text-zinc-600">
              {t("pageOf", { page, total: totalPages })}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 disabled:opacity-50"
            >
              {t("nextPage")}
            </button>
          </div>
        ) : null}
      </section>

      <section className="min-w-0 rounded-2xl border border-zinc-300 bg-white p-4 shadow-md sm:p-6">
        {!selected ? (
          <p className="text-sm text-zinc-600">{t("selectProfile")}</p>
        ) : detailLoading ? (
          <p className="text-sm text-zinc-600">{tc("loading")}</p>
        ) : selected.kind === "member" && memberDetail ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                {display(memberDetail.personal.fullName) || t("unnamed")}
              </h2>
              <p className="text-sm text-zinc-600">
                {memberDetail.profileCode
                  ? t("profileCode", { code: memberDetail.profileCode })
                  : null}
              </p>
            </div>

            <dl className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm md:grid-cols-2 [&>*]:min-w-0">
              <div>
                <dt className="text-zinc-500">{t("loginPhoneLabel")}</dt>
                <dd className="font-semibold text-zinc-900">
                  {display(memberDetail.phone)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{tv("phoneVerified")}</dt>
                <dd className="font-semibold text-zinc-900">
                  {memberDetail.phoneVerifiedAt
                    ? tv("phoneVerifiedYes")
                    : tv("phoneVerifiedNo")}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("accountStatus")}</dt>
                <dd className="font-semibold text-zinc-900">
                  {selected.isActive ? t("active") : t("inactive")}
                </dd>
              </div>
            </dl>

            {canManageMembership ? (
              <AdminMemberMembershipControls
                userId={selected.userId}
                subscriptionPlan={selected.subscriptionPlan}
                isPaidMember={selected.isPaidMember ?? false}
                onUpdated={(plan, isPaid) =>
                  updateSelectedMembership(selected.userId, plan, isPaid)
                }
              />
            ) : null}

            {memberDetail.profileCode ? (
              <VerificationAuditBiodataPdfButton
                profileId={memberDetail.profileId}
                profileCode={memberDetail.profileCode}
                authToken={localStorage.getItem(AUTH_TOKEN_KEY) ?? ""}
                dropdowns={dropdowns}
              />
            ) : null}

            <VerificationProfileDetails
              submission={memberDetail}
              acting={null}
              onBiodataReview={() => undefined}
              readOnly
              dropdowns={dropdowns}
            />

            {memberDetail.photos.length > 0 ? (
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600">
                  {tv("photosSection")}
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {memberDetail.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="rounded-xl border border-zinc-200 p-3"
                    >
                      {photo.mimeType.startsWith("image/") && (
                        <AuthenticatedBlobImage
                          token={localStorage.getItem(AUTH_TOKEN_KEY) ?? ""}
                          path={officerPhotoUrl(memberDetail.profileId, photo.id)}
                          alt={photo.type}
                          fetchBlob={fetchVerificationBlob}
                          className="mb-3 aspect-square w-full rounded-lg border border-zinc-200 object-cover"
                        />
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(photo.status)}`}
                      >
                        {tv(`status.${photo.status}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {renderDeletionRequest()}
          </div>
        ) : selected.kind === "staff" && staffDetail ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                {display(staffDetail.staffProfile?.fullName) || t("unnamed")}
              </h2>
              <p className="text-sm text-zinc-600">
                {t("roleLabel", {
                  role: t(`roles.${staffDetail.role}` as "roles.individual"),
                })}
              </p>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">{t("loginPhoneLabel")}</dt>
                <dd className="font-medium text-zinc-900">{display(staffDetail.phone)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("loginEmailLabel")}</dt>
                <dd className="font-medium text-zinc-900">
                  {display(staffDetail.staffProfile?.email ?? staffDetail.email)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{ts("employeeId")}</dt>
                <dd className="font-medium text-zinc-900">
                  {display(staffDetail.staffProfile?.employeeId)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{ts("designation")}</dt>
                <dd className="font-medium text-zinc-900">
                  {display(staffDetail.staffProfile?.designation)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{ts("officeDivision")}</dt>
                <dd className="font-medium text-zinc-900">
                  {display(staffDetail.staffProfile?.officeDivision)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{ts("officeDistrict")}</dt>
                <dd className="font-medium text-zinc-900">
                  {display(staffDetail.staffProfile?.officeDistrict)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">{ts("officeAddressLine")}</dt>
                <dd className="font-medium text-zinc-900">
                  {display(staffDetail.staffProfile?.officeAddressLine)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">{ts("notes")}</dt>
                <dd className="font-medium text-zinc-900">
                  {display(staffDetail.staffProfile?.notes)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("accountStatus")}</dt>
                <dd className="font-medium text-zinc-900">
                  {staffDetail.isActive ? t("active") : t("inactive")}
                </dd>
              </div>
            </dl>

            {renderDeletionRequest()}
          </div>
        ) : selected.kind === "member" && !memberDetail ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                {display(selected.fullName) || t("unnamed")}
              </h2>
              <p className="text-sm text-zinc-600">{t("noProfileYet")}</p>
            </div>

            <dl className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm md:grid-cols-2 [&>*]:min-w-0">
              <div>
                <dt className="text-zinc-500">{t("loginPhoneLabel")}</dt>
                <dd className="font-semibold text-zinc-900">
                  {display(selected.phone)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("accountStatus")}</dt>
                <dd className="font-semibold text-zinc-900">
                  {selected.isActive ? t("active") : t("inactive")}
                </dd>
              </div>
            </dl>

            {canManageMembership ? (
              <AdminMemberMembershipControls
                userId={selected.userId}
                subscriptionPlan={selected.subscriptionPlan}
                isPaidMember={selected.isPaidMember ?? false}
                onUpdated={(plan, isPaid) =>
                  updateSelectedMembership(selected.userId, plan, isPaid)
                }
              />
            ) : null}

            {renderDeletionRequest()}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">{t("noDetail")}</p>
        )}
      </section>
    </div>
  );
}
