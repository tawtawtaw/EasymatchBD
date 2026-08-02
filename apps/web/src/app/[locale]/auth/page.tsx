"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import {
  AUTH_TOKEN_KEY,
  getRedirectHint,
  restoreDeviceSession,
  sendOtp,
  verifyOtp,
  type AuthOtpPurpose,
} from "@/lib/api";
import {
  clearAuthSession,
  clearAuthToken,
  consumeSessionNotice,
  getDeviceSession,
  setAuthToken,
  setDeviceSession,
  signOut,
} from "@/lib/auth-session";
import { isStaffRole } from "@easymatch/shared";
import { staffHomePath } from "@/lib/staff-routing";

type AuthStep = "phone" | "otp" | "done";
type AuthMode = "member" | "staff";

type SignedInProfile = {
  phone: string | null;
  email: string | null;
  role: string;
  plan: string;
  completionPercent: number;
  completionMissing: string[];
};

function isProfileComplete(profile: SignedInProfile) {
  return (
    profile.completionMissing.length === 0 || profile.completionPercent >= 100
  );
}

type MeUser = Awaited<ReturnType<typeof getRedirectHint>>;

function memberPostLoginFallback(user: Pick<MeUser, "isVerified">): string {
  return user.isVerified ? "/home" : "/discovery";
}

function postLoginPath(user: MeUser): string {
  if (user.redirectPath) {
    return user.redirectPath;
  }
  if (isStaffRole(user.role)) {
    return staffHomePath(user.role);
  }
  return memberPostLoginFallback(user);
}

export default function AuthPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("member");
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [profile, setProfile] = useState<SignedInProfile | null>(null);

  const otpPurpose: AuthOtpPurpose = authMode === "staff" ? "staff" : "member";

  async function loadSignedInUser(token: string, redirect = false) {
    const user = await getRedirectHint(token);

    if (redirect) {
      setRedirecting(true);
      router.replace(postLoginPath(user));
      return;
    }

    setProfile({
      phone: user.phone,
      email: user.email,
      role: user.role,
      plan: user.plan ?? "free",
      completionPercent: user.completionPercent ?? 0,
      completionMissing: user.completionMissing ?? [],
    });
    setStep("done");
  }

  useEffect(() => {
    const notice = consumeSessionNotice();
    if (notice) setError(notice);

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      loadSignedInUser(token, true).catch(() => clearAuthToken());
      return;
    }

    const device = getDeviceSession();
    if (!device) return;

    setRedirecting(true);
    restoreDeviceSession(device.phone, device.deviceToken, device.purpose)
      .then((result) => {
        setAuthToken(result.accessToken);
        if (result.deviceToken) {
          setDeviceSession(
            result.deviceToken,
            device.phone,
            device.purpose,
          );
        }
        router.replace(
          result.redirectPath ??
            (isStaffRole(result.user.role)
              ? staffHomePath(result.user.role)
              : memberPostLoginFallback({ isVerified: false })),
        );
      })
      .catch(() => {
        clearAuthSession();
        setRedirecting(false);
      });
  }, [router]);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await sendOtp(phone, otpPurpose);
      setPhone(result.phone);
      setDevOtp(result.devOtp ?? null);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await verifyOtp(phone, code, otpPurpose, rememberDevice);
      setAuthToken(result.accessToken);
      if (result.deviceToken) {
        setDeviceSession(result.deviceToken, phone, otpPurpose);
      }
      setRedirecting(true);
      router.replace(
        result.redirectPath ??
          (isStaffRole(result.user.role)
            ? staffHomePath(result.user.role)
            : memberPostLoginFallback({ isVerified: false })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    signOut();
    setProfile(null);
    setCode("");
    setDevOtp(null);
    setStep("phone");
  }

  function switchAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setError(null);
    setStep("phone");
    setCode("");
    setDevOtp(null);
  }

  const profileComplete = profile ? isProfileComplete(profile) : false;
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const signedIn = step === "done" && profile && isStaff;

  if (redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-6 py-16">
        <div className="mx-auto max-w-md pt-24 text-center">
          <p className="text-zinc-600">{tc("loading")}</p>
        </div>
      </div>
    );
  }

  const title = signedIn
    ? t("welcome")
    : authMode === "member"
      ? t("signInTitle")
      : t("staffSignInTitle");

  const subtitle = signedIn
    ? t("signedIn")
    : authMode === "member"
      ? t("otpHint")
      : step === "otp"
        ? t("otpHint")
        : t("staffSignInHint");

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-6 py-16">
      <div className="mx-auto max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
            {t("backHome")}
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900">{title}</h1>
          <p className="text-zinc-800">{subtitle}</p>
        </div>

        {!signedIn && (
          <div className="flex rounded-full border border-rose-200 bg-white p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => switchAuthMode("member")}
              className={`flex-1 rounded-full px-3 py-2 transition ${
                authMode === "member"
                  ? "bg-rose-700 text-white"
                  : "text-rose-900 hover:bg-rose-50"
              }`}
            >
              {t("memberTab")}
            </button>
            <button
              type="button"
              onClick={() => switchAuthMode("staff")}
              className={`flex-1 rounded-full px-3 py-2 transition ${
                authMode === "staff"
                  ? "bg-rose-700 text-white"
                  : "text-rose-900 hover:bg-rose-50"
              }`}
            >
              {t("staffTab")}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-md">
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {!signedIn && step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <label className="block space-y-2">
                <span className="field-label">{t("mobile")}</span>
                <input
                  type="tel"
                  required
                  placeholder={t("mobilePlaceholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="field-input px-4 py-3"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-rose-700 px-4 py-3 font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60"
              >
                {loading ? t("sending") : t("sendOtp")}
              </button>
            </form>
          )}

          {!signedIn && step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-zinc-800">
                {t("codeSent")}{" "}
                <span className="font-semibold text-zinc-950">{phone}</span>
              </p>
              {devOtp && (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {t("devOtp")}:{" "}
                  <span className="font-mono font-semibold">{devOtp}</span>
                </p>
              )}
              <label className="block space-y-2">
                <span className="field-label">{t("sixDigitCode")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="field-input px-4 py-3 text-center font-mono text-lg tracking-widest"
                />
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-rose-700 focus:ring-rose-600"
                />
                <span>{t("rememberDevice")}</span>
              </label>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full rounded-lg bg-rose-700 px-4 py-3 font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60"
              >
                {loading ? t("verifying") : t("verify")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setDevOtp(null);
                }}
                className="w-full text-sm font-medium text-zinc-700 hover:text-zinc-950"
              >
                {t("differentNumber")}
              </button>
            </form>
          )}

          {signedIn && profile && (
            <div className="space-y-4">
              <dl className="space-y-3 text-sm">
                {profile.email && (
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-zinc-700">{t("email")}</dt>
                    <dd className="font-semibold text-zinc-950">{profile.email}</dd>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-zinc-700">{t("phone")}</dt>
                    <dd className="font-semibold text-zinc-950">{profile.phone}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-zinc-700">{t("role")}</dt>
                  <dd className="font-semibold text-zinc-950">{profile.role}</dd>
                </div>
                {!isStaff && (
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-zinc-700">{t("plan")}</dt>
                    <dd className="font-semibold text-zinc-950">{profile.plan}</dd>
                  </div>
                )}
              </dl>

              {profileComplete ? (
                <>
                  <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                    {isStaff ? t("staffProfileComplete") : t("profileComplete")}
                  </p>
                  {isStaff ? (
                    <Link
                      href={staffHomePath(profile.role)}
                      className="block w-full rounded-lg bg-rose-700 px-4 py-3 text-center font-semibold text-white transition hover:bg-rose-800"
                    >
                      {t("openStaffHome")}
                    </Link>
                  ) : (
                    <Link
                      href="/home"
                      className="block w-full rounded-lg bg-rose-700 px-4 py-3 text-center font-semibold text-white transition hover:bg-rose-800"
                    >
                      {t("browseDiscovery")}
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="block w-full rounded-lg border border-rose-300 px-4 py-3 text-center font-semibold text-rose-900 transition hover:bg-rose-50"
                  >
                    {tc("myProfile")}
                  </Link>
                </>
              ) : (
                <>
                  <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    {t("profileIncomplete", {
                      percent: profile.completionPercent,
                      count: profile.completionMissing.length,
                    })}
                  </p>
                  <Link
                    href="/profile"
                    className="block w-full rounded-lg bg-rose-700 px-4 py-3 text-center font-semibold text-white transition hover:bg-rose-800"
                  >
                    {isStaff ? t("completeStaffProfile") : t("completeProfile")}
                  </Link>
                </>
              )}

              {!profileComplete && isStaff && (
                <Link
                  href={staffHomePath(profile.role)}
                  className="block w-full rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-center font-semibold text-rose-900 transition hover:bg-rose-100"
                >
                  {t("openStaffHome")}
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-800 transition hover:bg-zinc-50"
              >
                {t("signOut")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
