"use client";

import { useEffect, useMemo, useState } from "react";
import {
  VIDEO_CALL_SCHEDULED_RING_MS,
  msUntilScheduledCallRing,
  shouldRingScheduledVideoCall,
} from "@easymatch/shared";
import type { VideoCallAlertItem } from "@/lib/video-calls";

export function useScheduledCallRingAlert(
  callAlerts: VideoCallAlertItem[] | undefined,
  suppressedCallIds: ReadonlySet<string>,
): VideoCallAlertItem | null {
  const [now, setNow] = useState(() => Date.now());

  const candidates = useMemo(
    () =>
      (callAlerts ?? []).filter(
        (alert) =>
          alert.call.status === "scheduled" &&
          Boolean(alert.call.scheduledAt) &&
          !suppressedCallIds.has(alert.call.id),
      ),
    [callAlerts, suppressedCallIds],
  );

  useEffect(() => {
    const delays: number[] = [];
    for (const alert of candidates) {
      const scheduledAt = alert.call.scheduledAt;
      if (!scheduledAt) continue;
      const untilStart = msUntilScheduledCallRing(scheduledAt, now);
      if (untilStart != null && untilStart > 0) {
        delays.push(untilStart);
        continue;
      }
      if (shouldRingScheduledVideoCall(scheduledAt, now)) {
        const at = new Date(scheduledAt).getTime();
        const untilEnd = at + VIDEO_CALL_SCHEDULED_RING_MS - now;
        if (untilEnd > 0) delays.push(untilEnd);
      }
    }
    if (delays.length === 0) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(50, Math.min(...delays)),
    );
    return () => window.clearTimeout(timer);
  }, [candidates, now]);

  return (
    candidates.find((alert) =>
      shouldRingScheduledVideoCall(alert.call.scheduledAt ?? "", now),
    ) ?? null
  );
}
