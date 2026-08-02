import { isOnBehalfProfile } from "@easymatch/shared";
import type { ProfileMedia } from "../types/media";

export type OnboardingMediaStep =
  | "primary"
  | "nidFront"
  | "nidBack"
  | "submit"
  | "complete";

export function getRequiredNidSubject(media: ProfileMedia) {
  return isOnBehalfProfile(media) ? "creator" : "member";
}

export function getOnboardingMediaStep(media: ProfileMedia): OnboardingMediaStep {
  const photos = media.photos ?? [];
  const nidDocuments = media.nidDocuments ?? [];
  const requiredSubject = getRequiredNidSubject(media);
  const requiredDocs = nidDocuments.filter((doc) => doc.subject === requiredSubject);
  const primary = photos.find((photo) => photo.type === "primary");
  const nidFront = requiredDocs.find((doc) => doc.side === "front");
  const nidBack = requiredDocs.find((doc) => doc.side === "back");

  if (!primary) return "primary";
  if (!nidFront) return "nidFront";
  if (!nidBack) return "nidBack";
  if (
    media.profileBiodataReviewStatus === "pending" ||
    media.profileBiodataReviewStatus === "approved"
  ) {
    return "complete";
  }
  return "submit";
}
