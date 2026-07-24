export type ComplaintReporterSummary = {
  fullName: string | null;
  profileCode: string | null;
} | undefined;

export function complaintReporterProfileCode(reporter: ComplaintReporterSummary) {
  return reporter?.profileCode ?? "—";
}

export function complaintReporterDisplayName(reporter: ComplaintReporterSummary) {
  const name = reporter?.fullName?.trim();
  return name ? name : null;
}

export function complaintTargetProfileCode(
  target: { profileCode: string } | undefined,
) {
  return target?.profileCode ?? "—";
}
