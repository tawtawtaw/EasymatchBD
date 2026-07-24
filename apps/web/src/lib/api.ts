import { EASYMATCH_API_URL } from "@easymatch/shared";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { apiFetch, readJsonResponse } from "@/lib/parse-response";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

async function parseResponse<T>(res: Response): Promise<T> {
  return readJsonResponse<T>(res);
}

function clientApiUrl(): string {
  return typeof window !== "undefined" ? getApiBaseUrl() : API_URL;
}

const SESSION_DEDUPE_TTL_MS = 1_500;
const BOOTSTRAP_DEDUPE_TTL_MS = 30_000;
const inflightRequests = new Map<string, Promise<unknown>>();
const recentResponses = new Map<string, { expiresAt: number; value: unknown }>();

export async function dedupeRequest<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = SESSION_DEDUPE_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const cached = recentResponses.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const request = loader()
    .then((value) => {
      recentResponses.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, request as Promise<unknown>);
  return request;
}

/** Drop cached API responses (e.g. after payment or logout). */
export function invalidateDedupeCache(keyPrefix?: string) {
  if (!keyPrefix) {
    recentResponses.clear();
    return;
  }
  for (const key of recentResponses.keys()) {
    if (key.startsWith(keyPrefix)) {
      recentResponses.delete(key);
    }
  }
}

export type AuthOtpPurpose = "member" | "staff";

export async function sendOtp(phone: string, purpose: AuthOtpPurpose = "member") {
  return parseResponse<{
    message: string;
    phone: string;
    expiresInSeconds: number;
    devOtp?: string;
  }>(await apiFetch(`${clientApiUrl()}/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, purpose }),
  }));
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: AuthOtpPurpose = "member",
  rememberDevice = true,
) {
  return parseResponse<{
    accessToken: string;
    tokenType: string;
    isNewUser: boolean;
    deviceToken: string | null;
    deviceExpiresInDays: number | null;
    redirectPath: string | null;
    user: {
      id: string;
      phone: string;
      email: string | null;
      role: string;
      phoneVerifiedAt: string | null;
      subscription: { plan: string; isActive: boolean } | null;
    };
  }>(await apiFetch(`${clientApiUrl()}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code, purpose, rememberDevice }),
  }));
}

export async function restoreDeviceSession(
  phone: string,
  deviceToken: string,
  purpose: AuthOtpPurpose = "member",
) {
  return parseResponse<{
    accessToken: string;
    tokenType: string;
    isNewUser: boolean;
    deviceToken: string | null;
    deviceExpiresInDays: number | null;
    redirectPath: string | null;
    user: {
      id: string;
      phone: string;
      email: string | null;
      role: string;
      phoneVerifiedAt: string | null;
      subscription: { plan: string; isActive: boolean } | null;
    };
  }>(await apiFetch(`${clientApiUrl()}/auth/device/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, deviceToken, purpose }),
  }));
}

export async function revokeDeviceSession(deviceToken: string) {
  return parseResponse<{ revoked: boolean }>(
    await apiFetch(`${clientApiUrl()}/auth/device/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceToken }),
    }),
  );
}

export async function getMe(token: string, full = false) {
  return dedupeRequest(
    `auth:me:${token}:${full ? "1" : "0"}`,
    async () =>
      parseResponse<{
        id: string;
        phone: string | null;
        email: string | null;
        role: string;
        profileKind?: "member" | "staff";
        termsAccepted?: boolean;
        termsAcceptedAt?: string | null;
        termsVersion?: string | null;
        currentTermsVersion?: string;
        termsDeclinedAt?: string | null;
        phoneVerifiedAt: string | null;
        emailVerifiedAt?: string | null;
        subscription: { plan: string; isActive: boolean } | null;
        completionPercent: number;
        completionMissing: string[];
        profile?: { id: string; isVerified: boolean } | null;
      }>(
        await apiFetch(`${clientApiUrl()}/auth/me${full ? "?full=1" : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    full ? BOOTSTRAP_DEDUPE_TTL_MS : SESSION_DEDUPE_TTL_MS,
  );
}

export type AuthSession = {
  role: string;
  profileKind: "member" | "staff";
  termsAccepted: boolean;
  termsVersion: string | null;
  currentTermsVersion: string;
  termsDeclinedAt: string | null;
  subscription?: { plan: string; isActive: boolean; endsAt?: string | null } | null;
  isPaidMember?: boolean;
  hasProfile?: boolean;
  isVerified?: boolean;
  isPaused?: boolean;
  pausedAt?: string | null;
};

export async function getSession(token: string) {
  return dedupeRequest(
    `auth:session:${token}`,
    async () =>
      parseResponse<AuthSession>(
        await apiFetch(`${clientApiUrl()}/auth/me/session`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    BOOTSTRAP_DEDUPE_TTL_MS,
  );
}

export type RedirectHint = {
  phone: string | null;
  email: string | null;
  role: string;
  plan: string;
  termsAccepted: boolean;
  completionPercent: number;
  completionMissing: string[];
  isVerified: boolean;
  redirectPath: string | null;
};

export async function getRedirectHint(token: string) {
  return dedupeRequest(
    `auth:redirect-hint:${token}`,
    async () =>
      parseResponse<RedirectHint>(
        await apiFetch(`${clientApiUrl()}/auth/me/redirect-hint`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    BOOTSTRAP_DEDUPE_TTL_MS,
  );
}

export type BiodataBootstrap = {
  termsAccepted: boolean;
  export: import("@/lib/profile-biodata-export").BiodataExportPayload | null;
  dropdowns: DropdownMap | null;
};

export async function getBiodataBootstrap(
  token: string,
  level: number,
  locale = "en",
) {
  return dedupeRequest(
    `auth:biodata-bootstrap:${token}:${level}:${locale}`,
    async () =>
      parseResponse<BiodataBootstrap>(
        await apiFetch(
          `${clientApiUrl()}/auth/me/biodata-bootstrap?level=${level}&locale=${locale}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      ),
    BOOTSTRAP_DEDUPE_TTL_MS,
  );
}

export type ProfileEditorBootstrap = {
  role: string;
  profileKind: "member" | "staff";
  termsAccepted: boolean;
  termsVersion: string | null;
  currentTermsVersion: string;
  termsDeclinedAt: string | null;
  completionPercent?: number;
  completionMissing?: string[];
  profile: Profile | StaffProfile | null;
  dropdowns: DropdownMap | null;
  verificationFeedback: import("@/lib/media").VerificationFeedback | null;
};

export async function getProfileEditorBootstrap(token: string, locale = "en") {
  return dedupeRequest(
    `auth:editor-bootstrap:${token}:${locale}`,
    async () =>
      parseResponse<ProfileEditorBootstrap>(
        await apiFetch(`${clientApiUrl()}/auth/me/editor-bootstrap?locale=${locale}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    BOOTSTRAP_DEDUPE_TTL_MS,
  );
}

export async function registerStaff(
  email: string,
  password: string,
  fullName?: string,
) {
  return parseResponse<{
    accessToken: string;
    tokenType: string;
    isNewUser: boolean;
    user: {
      id: string;
      phone: string | null;
      email: string | null;
      role: string;
    };
  }>(await apiFetch(`${clientApiUrl()}/auth/staff/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, fullName }),
  }));
}

export async function loginStaff(email: string, password: string) {
  return parseResponse<{
    accessToken: string;
    tokenType: string;
    isNewUser: boolean;
    user: {
      id: string;
      phone: string | null;
      email: string | null;
      role: string;
    };
  }>(await apiFetch(`${clientApiUrl()}/auth/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
}

export async function acceptTerms(version: string) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("Not signed in");

  return parseResponse<{
    accepted: boolean;
    termsVersion: string;
    termsAcceptedAt?: string;
  }>(await apiFetch(`${clientApiUrl()}/auth/terms/accept`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ version }),
  }));
}

export async function declineTerms() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("Not signed in");

  return parseResponse<{ declined: boolean; termsDeclinedAt?: string }>(
    await apiFetch(`${clientApiUrl()}/auth/terms/decline`, {
      method: "POST",
      headers: authHeaders(token),
    }),
  );
}

export const AUTH_TOKEN_KEY = "easymatch_access_token";

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export type DropdownMap = Record<
  string,
  { value: string; label: string; parentValue?: string | null }[]
>;

export type Sibling = {
  relationship?: string;
  name?: string;
  education?: string;
  profession?: string;
  maritalStatus?: string;
  spouseName?: string;
  spouseEducation?: string;
  spouseProfession?: string;
};

export type FamilyRelative = {
  relation?: string;
  name?: string;
  education?: string;
  profession?: string;
};

export type StaffProfile = {
  id: string;
  fullName: string | null;
  email: string | null;
  employeeId: string | null;
  designation: string | null;
  officeDivision: string | null;
  officeDistrict: string | null;
  officeAddressLine: string | null;
  notes: string | null;
  completionPercent: number;
  completionMissing: string[];
};

export type Profile = {
  id: string;
  profileCode: string;
  fullName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  divorceDetails: string | null;
  childrenCount: number | null;
  heightUnit: "cm" | "ft_in";
  heightCm: number | null;
  weightKg: number | null;
  complexion: string | null;
  hasDisability: boolean;
  disabilityInfo: string | null;
  religion: string | null;
  hasBeard: string | null;
  smokingHabit: string | null;
  expectedMarriageTimeline: string | null;
  dowryExpectation: string | null;
  weddingCeremonyPreference: string | null;
  expectedParenthoodTimeline: string | null;
  livingArrangements: string | null;
  livingArrangementsOther: string | null;
  expectedKabinAmountMinBdt: number | null;
  expectedKabinAmountMaxBdt: number | null;
  prayerPractice: string | null;
  hijabPractice: string | null;
  highestDegree: string | null;
  educationMedium: string | null;
  additionalEducationQualifications: string | null;
  institution: string | null;
  educationYear: number | null;
  educationSubject: string | null;
  occupation: string | null;
  company: string | null;
  designation: string | null;
  monthlyIncomeRange: string | null;
  currentCountry: string;
  currentDivision: string | null;
  currentDistrict: string | null;
  currentUpazila: string | null;
  currentCityTown: string | null;
  currentAddressLine: string | null;
  permanentCountry: string | null;
  permanentDivision: string | null;
  permanentDistrict: string | null;
  permanentUpazila: string | null;
  permanentCityTown: string | null;
  permanentAddressLine: string | null;
  permanentSameAsCurrent: boolean;
  biography: string | null;
  hobbies: string[];
  interests: string | null;
  introduction: string | null;
  creationMode: "self" | "on_behalf" | null;
  onBehalfRelation: string | null;
  isVerified: boolean;
  verifiedOnBehalf: boolean;
  nidVerifiedAt: string | null;
  creatorNidVerifiedAt: string | null;
  nidStatus: "not_submitted" | "pending" | "verified" | "rejected";
  photos: {
    id: string;
    type: "primary" | "gallery";
    mimeType: string;
    fileSize: number;
    sortOrder: number;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
  }[];
  nidDocuments: {
    id: string;
    side: "front" | "back";
    subject: "member" | "creator";
    mimeType: string;
    fileSize: number;
    status: "pending" | "approved" | "rejected";
    submittedAt: string;
    reviewedAt: string | null;
  }[];
  familyInfo: {
    fatherName?: string | null;
    fatherIsAlive?: string | null;
    fatherEducation?: string | null;
    fatherProfession?: string | null;
    motherName?: string | null;
    motherIsAlive?: string | null;
    motherEducation?: string | null;
    motherProfession?: string | null;
    familyType?: string | null;
    familyStatus?: string | null;
    familyValues?: string | null;
    familyAssets?: string | null;
  } | null;
  siblings: Sibling[];
  paternalRelatives: FamilyRelative[];
  maternalRelatives: FamilyRelative[];
  partnerPreference: {
    ageMin?: number | null;
    ageMax?: number | null;
    heightUnit?: "cm" | "ft_in";
    heightMinCm?: number | null;
    heightMaxCm?: number | null;
    weightMinKg?: number | null;
    weightMaxKg?: number | null;
    preferredDistricts?: string[];
    minimumEducation?: string | null;
    preferredProfession?: string[];
    beardPreference?: string | null;
    prayerPreference?: string | null;
    hijabPreference?: string | null;
    maritalStatusPref?: string[];
    additionalNotes?: string | null;
  } | null;
  completionPercent: number;
  completionMissing: string[];
};

const DROPDOWN_CACHE_PREFIX = "easymatch_dropdowns_v4_";

export async function getDropdowns(locale = "en") {
  const cacheKey = `${DROPDOWN_CACHE_PREFIX}${locale}`;

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached?.trim()) {
      const parsed = JSON.parse(cached) as DropdownMap;
      void apiFetch(`${clientApiUrl()}/profiles/dropdowns?locale=${locale}`)
        .then(async (res) => (res.ok ? readJsonResponse<DropdownMap>(res) : null))
        .then((fresh) => {
          if (fresh) sessionStorage.setItem(cacheKey, JSON.stringify(fresh));
        })
        .catch(() => undefined);
      return parsed;
    }
  } catch {
    try {
      sessionStorage.removeItem(cacheKey);
    } catch {
      // ignore
    }
  }

  const data = await parseResponse<DropdownMap>(
    await apiFetch(`${clientApiUrl()}/profiles/dropdowns?locale=${locale}`),
  );

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // ignore cache write errors
  }

  return data;
}

export async function getMyProfile(token: string) {
  return dedupeRequest(
    `profiles:me:${token}`,
    async () =>
      parseResponse<Profile | StaffProfile>(
        await apiFetch(`${clientApiUrl()}/profiles/me`, {
          headers: authHeaders(token),
        }),
      ),
    BOOTSTRAP_DEDUPE_TTL_MS,
  );
}

export async function updateStaffProfile(
  token: string,
  data: Record<string, unknown>,
) {
  return parseResponse<StaffProfile>(
    await apiFetch(`${clientApiUrl()}/profiles/staff/me`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),
  );
}

export async function setCreationIntent(
  token: string,
  data: {
    creationMode: "self" | "on_behalf";
    onBehalfRelation?: string;
  },
) {
  return parseResponse<Profile>(
    await apiFetch(`${clientApiUrl()}/profiles/me/creation-intent`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),
  );
}

export async function updatePersonal(
  token: string,
  data: Record<string, unknown>,
) {
  return parseResponse<Profile>(
    await apiFetch(`${clientApiUrl()}/profiles/me/personal`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),
  );
}

export async function updateFamily(
  token: string,
  data: Record<string, unknown>,
) {
  return parseResponse<Profile>(
    await apiFetch(`${clientApiUrl()}/profiles/me/family`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),
  );
}

export async function updatePartner(
  token: string,
  data: Record<string, unknown>,
) {
  return parseResponse<Profile>(
    await apiFetch(`${clientApiUrl()}/profiles/me/partner`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),
  );
}

export async function updateMarital(
  token: string,
  data: Record<string, unknown>,
) {
  return parseResponse<Profile>(
    await apiFetch(`${clientApiUrl()}/profiles/me/marital`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),
  );
}
