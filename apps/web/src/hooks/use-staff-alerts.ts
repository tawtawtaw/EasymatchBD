"use client";

import { useStaffAlerts } from "@/components/StaffAlertsProvider";

export function useStaffAlertsSummary() {
  return useStaffAlerts();
}
