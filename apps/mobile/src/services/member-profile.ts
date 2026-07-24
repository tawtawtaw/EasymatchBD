import { getMyProfile } from "./profile";
import { getProfileMedia } from "./media";
import type { MemberHomeBootstrap } from "../types/discovery";
import type { ProfileEditorBootstrap } from "../types/profile";

export type MemberProfileSummary = {
  fullName: string | null;
  profileCode: string | null;
  gender: string | null;
  primaryPhotoId: string | null;
};

export function memberProfileSummaryFromHomeBootstrap(
  bootstrap: MemberHomeBootstrap["profile"],
): MemberProfileSummary {
  return {
    fullName: bootstrap.fullName,
    profileCode: bootstrap.profileCode,
    gender: null,
    primaryPhotoId: bootstrap.primaryPhotoId,
  };
}

export function memberProfileSummaryFromEditorBootstrap(
  bootstrap: ProfileEditorBootstrap,
): MemberProfileSummary {
  const profile = bootstrap.profile;
  const primaryFromProfile = profile?.photos?.find((photo) => photo.type === "primary");
  return {
    fullName: profile?.fullName ?? null,
    profileCode: profile?.profileCode ?? null,
    gender: profile?.gender ?? null,
    primaryPhotoId: primaryFromProfile?.id ?? null,
  };
}

export async function getMemberProfileSummary(): Promise<MemberProfileSummary> {
  const [profile, media] = await Promise.all([
    getMyProfile(),
    getProfileMedia().catch(() => null),
  ]);

  const primaryFromMedia = media?.photos?.find((photo) => photo.type === "primary");
  const primaryFromProfile = profile?.photos?.find((photo) => photo.type === "primary");

  return {
    fullName: profile?.fullName ?? null,
    profileCode: profile?.profileCode ?? null,
    gender: profile?.gender ?? null,
    primaryPhotoId: primaryFromMedia?.id ?? primaryFromProfile?.id ?? null,
  };
}

export function resolveMemberProfileDisplayName(
  summary: Pick<MemberProfileSummary, "fullName" | "profileCode"> | null | undefined,
  fallback = "Member",
) {
  return summary?.fullName?.trim() || summary?.profileCode?.trim() || fallback;
}
