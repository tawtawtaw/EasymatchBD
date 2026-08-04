const PROFILE_AMENDMENT_DIRTY_KEY = "easymatch_profile_amendment_dirty";

export function markProfileAmendmentDirty() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PROFILE_AMENDMENT_DIRTY_KEY, "1");
}

export function clearProfileAmendmentDirty() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PROFILE_AMENDMENT_DIRTY_KEY);
}

export function isProfileAmendmentDirty() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(PROFILE_AMENDMENT_DIRTY_KEY) === "1";
}
