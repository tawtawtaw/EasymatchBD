export type SiteNavLayout = "inline" | "stack";

export function siteNavLinkClass(layout: SiteNavLayout = "inline") {
  const base = "text-sm font-semibold text-zinc-800 hover:text-rose-800";
  return layout === "stack"
    ? `${base} block rounded-lg px-2 py-2.5 hover:bg-zinc-50`
    : base;
}

export function siteNavBrowseLinkClass(layout: SiteNavLayout = "inline") {
  const base = "text-sm font-medium text-zinc-700 hover:text-rose-800";
  return layout === "stack"
    ? `${base} block rounded-lg px-2 py-2.5 hover:bg-zinc-50`
    : base;
}
