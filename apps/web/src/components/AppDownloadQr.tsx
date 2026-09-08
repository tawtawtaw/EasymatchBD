"use client";

export function AppDownloadQr({
  dataUrl,
  label,
}: {
  dataUrl: string;
  label: string;
}) {
  return (
    <img
      src={dataUrl}
      alt={label}
      width={220}
      height={220}
      className="h-[220px] w-[220px] rounded-xl bg-white p-2 shadow-sm"
    />
  );
}
