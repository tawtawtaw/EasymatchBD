import type { PublicAndroidAppRelease } from "@easymatch/shared";
import { apiRequest } from "./api/client";

export async function getPublicAndroidAppRelease(): Promise<PublicAndroidAppRelease | null> {
  try {
    return await apiRequest<PublicAndroidAppRelease>("/public/app/latest", {
      auth: false,
    });
  } catch {
    return null;
  }
}
