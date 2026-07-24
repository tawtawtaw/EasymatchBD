import { EASYMATCH_API_URL } from "@easymatch/shared";
import type { DiscoveryFilters } from "@/lib/discovery";
import { searchParamsFromFilters } from "@/lib/public-browse-filters";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? EASYMATCH_API_URL;

export type AdminBiodataCsvExportResult = {
  blob: Blob;
  rowCount: number;
  truncated: boolean;
  filename: string;
};

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] ?? null;
}

export async function downloadAdminBiodataCsv(
  token: string,
  filters: DiscoveryFilters,
  locale = "en",
): Promise<AdminBiodataCsvExportResult> {
  const params = searchParamsFromFilters(filters);
  if (locale === "bn") {
    params.set("locale", "bn");
  }
  const res = await fetch(
    `${API_URL}/admin/profiles/export.csv?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    let message = "Could not export biodata CSV";
    try {
      const data = (await res.json()) as { message?: string | string[] };
      message = Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message || message;
    } catch {
      // CSV error responses may not be JSON.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const rowCount = Number(res.headers.get("X-Export-Row-Count") ?? "0");
  const truncated = res.headers.get("X-Export-Truncated") === "true";
  const filename =
    parseFilename(res.headers.get("Content-Disposition")) ??
    `easymatch-biodata-export.csv`;

  return { blob, rowCount, truncated, filename };
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
