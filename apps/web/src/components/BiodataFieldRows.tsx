import type { ReactNode } from "react";

type BiodataFieldRow = {
  key: string;
  label: string;
  value: string;
};

export type BiodataSectionTheme =
  | "rose"
  | "emerald"
  | "sky"
  | "amber"
  | "violet"
  | "teal";

const WEB_THEMES: Record<
  BiodataSectionTheme,
  { border: string; label: string; accent: string; header: string; shellBorder: string }
> = {
  rose: {
    border: "border-rose-200",
    label: "bg-rose-100 text-rose-950",
    accent: "border-l-4 border-l-rose-500",
    header: "from-rose-800 to-rose-700",
    shellBorder: "border-rose-200",
  },
  emerald: {
    border: "border-emerald-200",
    label: "bg-emerald-100 text-emerald-950",
    accent: "border-l-4 border-l-emerald-500",
    header: "from-emerald-800 to-emerald-700",
    shellBorder: "border-emerald-200",
  },
  sky: {
    border: "border-sky-200",
    label: "bg-sky-100 text-sky-950",
    accent: "border-l-4 border-l-sky-500",
    header: "from-sky-800 to-sky-700",
    shellBorder: "border-sky-200",
  },
  amber: {
    border: "border-amber-200",
    label: "bg-amber-100 text-amber-950",
    accent: "border-l-4 border-l-amber-500",
    header: "from-amber-800 to-amber-700",
    shellBorder: "border-amber-200",
  },
  violet: {
    border: "border-violet-200",
    label: "bg-violet-100 text-violet-950",
    accent: "border-l-4 border-l-violet-500",
    header: "from-violet-800 to-violet-700",
    shellBorder: "border-violet-200",
  },
  teal: {
    border: "border-teal-200",
    label: "bg-teal-100 text-teal-950",
    accent: "border-l-4 border-l-teal-500",
    header: "from-teal-800 to-teal-700",
    shellBorder: "border-teal-200",
  },
};

type BiodataFieldRowsProps = {
  rows: BiodataFieldRow[];
  theme?: BiodataSectionTheme;
  variant?: "web" | "pdf";
};

export function BiodataFieldRows({
  rows,
  theme = "rose",
  variant = "web",
}: BiodataFieldRowsProps) {
  if (rows.length === 0) return null;

  if (variant === "pdf") {
    return (
      <div className="biodata-pdf-field-list">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className={`biodata-pdf-field-row biodata-pdf-field-row-${theme} biodata-pdf-field-row-${index % 2 === 0 ? "even" : "odd"}`}
          >
            <span className="biodata-pdf-field-label">{row.label}</span>
            <span className="biodata-pdf-field-value">{row.value}</span>
          </div>
        ))}
      </div>
    );
  }

  const palette = WEB_THEMES[theme];

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div
          key={row.key}
          className={`flex overflow-hidden rounded-lg border bg-white shadow-sm ${palette.border} ${palette.accent}`}
        >
          <div
            className={`w-[42%] shrink-0 border-r px-3 py-2.5 text-sm font-semibold sm:w-[38%] sm:px-4 ${palette.border} ${palette.label}`}
          >
            {row.label}
          </div>
          <div className="flex min-w-0 flex-1 items-center bg-white px-3 py-2.5 text-sm leading-relaxed text-zinc-900 sm:px-4">
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function biodataThemeForSection(
  kind:
    | "personal"
    | "family"
    | "marital"
    | "partner"
    | "siblings"
    | "paternal_relatives"
    | "maternal_relatives"
    | "contact",
): BiodataSectionTheme {
  switch (kind) {
    case "personal":
      return "rose";
    case "family":
      return "emerald";
    case "marital":
      return "violet";
    case "siblings":
      return "sky";
    case "paternal_relatives":
    case "maternal_relatives":
      return "violet";
    case "partner":
      return "amber";
    case "contact":
      return "teal";
    default:
      return "rose";
  }
}

export function BiodataSectionShell({
  title,
  theme = "rose",
  children,
}: {
  title: string;
  theme?: BiodataSectionTheme;
  children: ReactNode;
}) {
  const palette = WEB_THEMES[theme];

  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white shadow-md ${palette.shellBorder}`}
    >
      <div className={`bg-gradient-to-r px-4 py-3 sm:px-5 ${palette.header}`}>
        <h2 className="text-base font-bold uppercase tracking-wide text-white sm:text-lg">
          {title}
        </h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
