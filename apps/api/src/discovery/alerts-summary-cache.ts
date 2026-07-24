type AlertsSummaryCacheInvalidator = (userId: string) => void;

let invalidator: AlertsSummaryCacheInvalidator | null = null;

export function registerAlertsSummaryCacheInvalidator(
  fn: AlertsSummaryCacheInvalidator,
) {
  invalidator = fn;
}

export function invalidateAlertsSummaryCache(userId: string) {
  invalidator?.(userId);
}
