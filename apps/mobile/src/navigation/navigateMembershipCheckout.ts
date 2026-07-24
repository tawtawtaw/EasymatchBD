import { navigationRef } from "./navigationRef";

export function navigateToMembershipCheckout(): boolean {
  if (!navigationRef.isReady()) return false;
  navigationRef.navigate("MembershipCheckout");
  return true;
}
