"use client";

import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { FieldLabel } from "@/components/FieldLabel";
import { DistrictSelectField } from "@/components/DistrictFields";
import { Link } from "@/i18n/routing";
import { useMounted } from "@/hooks/use-mounted";
import {
  AUTH_TOKEN_KEY,
  DropdownMap,
  getDropdowns,
  getMyProfile,
  StaffProfile,
  updateStaffProfile,
} from "@/lib/api";
import { isSuperAdminRole } from "@/lib/admin";
import { isOfficerRole } from "@/lib/verification";

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </label>
  );
}

function StaffSelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  const tc = useTranslations("common");

  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      >
        <option value="">{tc("select")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="field-label">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </label>
  );
}

export function StaffProfileForm({
  role,
  initialDropdowns,
  initialProfile,
}: {
  role: string;
  initialDropdowns?: DropdownMap;
  initialProfile?: StaffProfile;
}) {
  const locale = useLocale();
  const t = useTranslations("staffProfile");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const mounted = useMounted();
  const [dropdowns, setDropdowns] = useState<DropdownMap>(initialDropdowns ?? {});
  const [profile, setProfile] = useState<StaffProfile | null>(
    initialProfile ?? null,
  );
  const [form, setForm] = useState({
    fullName: initialProfile?.fullName ?? "",
    email: initialProfile?.email ?? "",
    employeeId: initialProfile?.employeeId ?? "",
    designation: initialProfile?.designation ?? "",
    officeDivision: initialProfile?.officeDivision ?? "",
    officeDistrict: initialProfile?.officeDistrict ?? "",
    officeAddressLine: initialProfile?.officeAddressLine ?? "",
    notes: initialProfile?.notes ?? "",
  });
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (token: string, lang: string) => {
    const [dd, p] = await Promise.all([getDropdowns(lang), getMyProfile(token)]);
    setDropdowns(dd);
    setProfile(p as StaffProfile);
    setForm({
      fullName: p.fullName ?? "",
      email: p.email ?? "",
      employeeId: p.employeeId ?? "",
      designation: p.designation ?? "",
      officeDivision: p.officeDivision ?? "",
      officeDistrict: p.officeDistrict ?? "",
      officeAddressLine: p.officeAddressLine ?? "",
      notes: p.notes ?? "",
    });
  }, []);

  useEffect(() => {
    if (initialProfile) return;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    load(token, locale)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [initialProfile, load, locale]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateStaffProfile(token, form);
      setProfile(updated);
      setMessage(t("saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-700">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
            {t("backHome")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-600">{t("subtitle")}</p>
          {profile && (
            <p className="mt-2 text-sm font-medium text-zinc-700">
              {t("percentComplete", { percent: profile.completionPercent ?? 0 })}
            </p>
          )}
        </div>

        {message && (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-zinc-300 bg-white p-6 shadow-md"
        >
          <p className="text-xs text-zinc-600">{t("requiredLegend")}</p>
          <section className="space-y-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 sm:p-5">
            <h2 className="text-base font-bold text-zinc-950">{t("sections.identity")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                required
                label={t("fields.fullName")}
                value={form.fullName}
                onChange={(fullName) => setForm({ ...form, fullName })}
              />
              <TextField
                required
                label={t("fields.email")}
                type="email"
                value={form.email}
                onChange={(email) => setForm({ ...form, email })}
              />
              <TextField
                required
                label={t("fields.employeeId")}
                value={form.employeeId}
                onChange={(employeeId) => setForm({ ...form, employeeId })}
              />
              <TextField
                required
                label={t("fields.designation")}
                value={form.designation}
                onChange={(designation) => setForm({ ...form, designation })}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 sm:p-5">
            <h2 className="text-base font-bold text-zinc-950">{t("sections.office")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <StaffSelectField
                required
                label={t("fields.officeDivision")}
                value={form.officeDivision}
                onChange={(officeDivision) =>
                  setForm({ ...form, officeDivision, officeDistrict: "" })
                }
                options={dropdowns.division ?? []}
              />
              <DistrictSelectField
                required
                label={t("fields.officeDistrict")}
                division={form.officeDivision}
                value={form.officeDistrict}
                onChange={(officeDistrict) =>
                  setForm({ ...form, officeDistrict })
                }
                districts={dropdowns.district ?? []}
              />
              <div className="sm:col-span-2">
                <TextField
                  label={t("fields.officeAddressLine")}
                  value={form.officeAddressLine}
                  onChange={(officeAddressLine) =>
                    setForm({ ...form, officeAddressLine })
                  }
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 sm:p-5">
            <h2 className="text-base font-bold text-zinc-950">{t("sections.notes")}</h2>
            <TextAreaField
              label={t("fields.notes")}
              value={form.notes}
              onChange={(notes) => setForm({ ...form, notes })}
              rows={4}
            />
          </section>

          <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-4">
            {isOfficerRole(role) && (
              <Link
                href="/verification"
                className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 hover:bg-rose-100"
              >
                {ta("openVerification")}
              </Link>
            )}
            {isSuperAdminRole(role) && (
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                {ta("openAdmin")}
              </Link>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-rose-700 px-4 py-3 font-semibold text-white shadow-sm hover:bg-rose-800 disabled:opacity-60"
            >
              {saving ? tc("saving") : tc("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
