import { Link } from "@/i18n/routing";

type MarketingInfoSection = {
  title: string;
  body: string;
};

type MarketingInfoPageProps = {
  backHomeLabel: string;
  title: string;
  intro: string;
  sections: MarketingInfoSection[];
  cta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function MarketingInfoPage({
  backHomeLabel,
  title,
  intro,
  sections,
  cta,
  secondaryCta,
}: MarketingInfoPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
          {backHomeLabel}
        </Link>

        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-zinc-900">{title}</h1>
          <p className="text-base leading-relaxed text-zinc-600">{intro}</p>
        </header>

        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-zinc-900">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{section.body}</p>
            </section>
          ))}
        </div>

        {cta || secondaryCta ? (
          <div className="flex flex-wrap gap-3">
            {cta ? (
              <Link
                href={cta.href}
                className="inline-flex rounded-full bg-rose-700 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-800"
              >
                {cta.label}
              </Link>
            ) : null}
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex rounded-full border border-rose-300 px-6 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
