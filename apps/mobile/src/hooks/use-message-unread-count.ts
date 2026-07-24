import { useCallback } from "react";
import { useMemberAlertsStore } from "../store/memberAlertsStore";

export function useMessageUnreadCount() {
  const unreadCount = useMemberAlertsStore((s) => s.unreadMessages);
  const refresh = useCallback(async () => {
    await useMemberAlertsStore.getState().refresh();
  }, []);

  return { unreadCount, refresh };
}
