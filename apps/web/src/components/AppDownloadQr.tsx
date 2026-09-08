"use client";

export function AppDownloadQr({
  dataUrl,
  label,
  size = 220,
}: {
  dataUrl: string;
  label: string;
  size?: number;
}) {
  return (
    <img
      src={dataUrl}
      alt={label}
      width={size}
      height={size}
      className="shrink-0 rounded-lg bg-white"
      style={{ width: size, height: size }}
    />
  );
}
