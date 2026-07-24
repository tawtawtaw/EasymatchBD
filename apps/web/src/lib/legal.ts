import { EASYMATCH_API_URL } from "@easymatch/shared";
import {
  getFallbackTerms,
  type PublishedTerms,
} from "@/content/terms-content";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & {
    message?: string | string[];
    statusCode?: number;
  };
  if (!res.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function fetchPublishedTerms(
  locale: string,
): Promise<PublishedTerms> {
  try {
    const res = await fetch(
      `${API_URL}/legal/terms?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 60 } },
    );
    return await parseResponse<PublishedTerms>(res);
  } catch {
    return getFallbackTerms(locale);
  }
}

export async function fetchPublishedTermsClient(
  locale: string,
): Promise<PublishedTerms> {
  try {
    const res = await fetch(
      `${API_URL}/legal/terms?locale=${encodeURIComponent(locale)}`,
    );
    return await parseResponse<PublishedTerms>(res);
  } catch {
    return getFallbackTerms(locale);
  }
}
