"use client";

import { useEffect, useRef, useState } from "react";
import {
  VIDEO_CALL_DURATION_WARNING_MS,
  videoCallRemainingMs,
} from "@easymatch/shared";

export function useVideoCallDurationLimit(
  startedAt: string | null | undefined,
  onExpire?: () => void,
) {
  const [now, setNow] = useState(() => Date.now());
  const onExpireRef = useRef(onExpire);
  const expiredNotifiedRef = useRef(false);

  onExpireRef.current = onExpire;

  const remainingMs = startedAt ? videoCallRemainingMs(startedAt, now) : null;
  const showWarning =
    remainingMs != null &&
    remainingMs > 0 &&
    remainingMs <= VIDEO_CALL_DURATION_WARNING_MS;
  const expired = remainingMs != null && remainingMs <= 0;

  useEffect(() => {
    expiredNotifiedRef.current = false;
  }, [startedAt]);

  useEffect(() => {
    if (!startedAt) return;

    const remaining = videoCallRemainingMs(startedAt);
    if (remaining == null) return;
    if (remaining <= 0) {
      setNow(Date.now());
      return;
    }

    const msUntilWarning = Math.max(0, remaining - VIDEO_CALL_DURATION_WARNING_MS);
    let intervalId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      setNow(Date.now());
      intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    }, msUntilWarning);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId != null) {
        window.clearInterval(intervalId);
      }
    };
  }, [startedAt]);

  useEffect(() => {
    if (!expired || expiredNotifiedRef.current) return;
    expiredNotifiedRef.current = true;
    onExpireRef.current?.();
  }, [expired]);

  return { remainingMs, showWarning, expired };
}
