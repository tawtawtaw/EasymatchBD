import { Link } from "@/i18n/routing";
import {
  ServiceDeliveryTimelineTable,
  type ServiceDeliveryTimelineRow,
} from "@/components/ServiceDeliveryTimelineTable";

type MarketingInfoSection = {
  title: string;
  body?: string;
  bullets?: string[];
};

type CompanyDetailRow = {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
};

type MarketingInfoPageProps = {
  backHomeLabel: string;
  title: string;
  intro: string;
  introParagraphs?: string[];
  sections: MarketingInfoSection[];
  companyDetails?: {
    title: string;
    rows: CompanyDetailRow[];
  };
  effectiveDate?: string;
  deliveryTimeline?: {
    title: string;
    columns: { service: string; timeline: string; remarks: string };
    rows: ServiceDeliveryTimelineRow[];
  };
  cta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function MarketingInfoPage({
  backHomeLabel,
  title,
  intro,
  introParagraphs,
  sections,
  companyDetails,
  effectiveDate,
  deliveryTimeline,
  cta,
  secondaryCta,
}: MarketingInfoPageProps) {
  const intros = introParagraphs?.length ? introParagraphs : [intro];

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/" className="text-sm font-medium text-rose-700 hover:underline">
          {backHomeLabel}
        </Link>

        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-zinc-900">{title}</h1>
          {effectiveDate ? (
            <p className="text-sm font-medium text-zinc-700">{effectiveDate}</p>
          ) : null}
          <div className="space-y-3">
            {intros.map((paragraph, index) => (
              <p
                key={index}
                className="text-base leading-relaxed text-zinc-600"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </header>

        {deliveryTimeline ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <ServiceDeliveryTimelineTable
              title={deliveryTimeline.title}
              columns={deliveryTimeline.columns}
              rows={deliveryTimeline.rows}
            />
          </section>
        ) : null}

        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-zinc-900">{section.title}</h2>
              {section.body ? (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{section.body}</p>
              ) : null}
              {section.bullets?.length ? (
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600">
                  {section.bullets.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {companyDetails ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">{companyDetails.title}</h2>
              <dl className="mt-4 divide-y divide-zinc-100">
                {companyDetails.rows.map((row) => (
                  <div
                    key={row.label}
                    className="grid gap-1 py-3 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4"
                  >
                    <dt className="text-sm font-medium text-zinc-800">{row.label}</dt>
                    <dd className="text-sm leading-relaxed text-zinc-600">
                      {row.href ? (
                        <a
                          href={row.href}
                          className="font-medium text-rose-800 hover:text-rose-900 hover:underline"
                          {...(row.external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
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
