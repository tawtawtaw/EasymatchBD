import type { ConsultantServiceType } from "@easymatch/shared";
import { navigationRef } from "./navigationRef";

export function navigateToConsultantCheckout(params: {
  connectionId: string;
  serviceType: ConsultantServiceType;
  memberNotes?: string;
}): boolean {
  if (!navigationRef.isReady()) return false;
  navigationRef.navigate("ConsultantCheckout", params);
  return true;
}

export function navigateToConsultantCase(caseId: string): boolean {
  if (!navigationRef.isReady()) return false;
  navigationRef.navigate("ConsultantCase", { caseId });
  return true;
}
