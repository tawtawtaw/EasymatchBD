"use client";

import { useEffect, useRef } from "react";
import {
  closeMobileCheckoutWebSession,
  isMobileCheckoutSession,
  notifyMobileAppCheckoutComplete,
} from "@/lib/mobile-membership-checkout";

export function useMobileMembershipCheckoutResult(
  outcome: "success" | "fail" | "cancel",
  ready: boolean,
) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!ready || sentRef.current || !isMobileCheckoutSession()) return;
    sentRef.current = true;
    notifyMobileAppCheckoutComplete(outcome);
    closeMobileCheckoutWebSession();
  }, [outcome, ready]);
}
