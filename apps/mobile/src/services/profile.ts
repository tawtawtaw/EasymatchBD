import { apiRequest } from "./api/client";
import { dedupeRequest, invalidateDedupeCache } from "./api/dedupe";
import type { DropdownMap } from "../types/dropdowns";
import type { MemberProfile, ProfileEditorBootstrap } from "../types/profile";

export async function getMyProfile() {
  return dedupeRequest("profile:me", () => apiRequest<MemberProfile>("/profiles/me"), 15_000);
}

export function invalidateProfileEditorBootstrapCache() {
  invalidateDedupeCache("profile:editor-bootstrap");
}

export async function getProfileEditorBootstrap(locale = "en") {
  return dedupeRequest(
    `profile:editor-bootstrap:${locale}`,
    () =>
      apiRequest<
        ProfileEditorBootstrap & {
          dropdowns: DropdownMap | null;
        }
      >(`/auth/me/editor-bootstrap?locale=${encodeURIComponent(locale)}`),
    5_000,
  );
}

export async function updatePersonal(data: Record<string, unknown>) {
  return apiRequest<MemberProfile>("/profiles/me/personal", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updateFamily(data: Record<string, unknown>) {
  return apiRequest<MemberProfile>("/profiles/me/family", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updatePartner(data: Record<string, unknown>) {
  return apiRequest<MemberProfile>("/profiles/me/partner", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updateMarital(data: Record<string, unknown>) {
  return apiRequest<MemberProfile>("/profiles/me/marital", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
