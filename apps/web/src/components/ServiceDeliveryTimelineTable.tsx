export type ServiceDeliveryTimelineRow = {
  service: string;
  timeline: string;
  remarks: string;
};

type ServiceDeliveryTimelineTableProps = {
  title?: string;
  columns: {
    service: string;
    timeline: string;
    remarks: string;
  };
  rows: ServiceDeliveryTimelineRow[];
  compact?: boolean;
};

export function ServiceDeliveryTimelineTable({
  title,
  columns,
  rows,
  compact = false,
}: ServiceDeliveryTimelineTableProps) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {title ? (
        <h3
          className={
            compact
              ? "text-sm font-semibold text-zinc-900"
              : "text-lg font-semibold text-zinc-900"
          }
        >
          {title}
        </h3>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th scope="col" className="px-3 py-2.5 font-semibold text-zinc-900">
                {columns.service}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-zinc-900">
                {columns.timeline}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-zinc-900">
                {columns.remarks}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr key={`${row.service}-${row.timeline}`}>
                <td className="px-3 py-2.5 align-top font-medium text-zinc-800">
                  {row.service}
                </td>
                <td className="px-3 py-2.5 align-top text-zinc-700">{row.timeline}</td>
                <td className="px-3 py-2.5 align-top text-zinc-600">{row.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
