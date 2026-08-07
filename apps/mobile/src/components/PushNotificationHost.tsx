import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import {
  ensurePushNotificationsWhileLoggedOut,
  enablePushNotificationsOnLogin,
  flushPendingPushNavigation,
  handleColdStartNotification,
} from "../services/push-notifications";
import { flushPendingIncomingCallNavigation } from "../services/incoming-call-navigation";

/** Keeps push delivery working while logged out; registers token when logged in. */
export function PushNotificationHost() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    void (async () => {
      if (!userId) {
        await ensurePushNotificationsWhileLoggedOut();
        await handleColdStartNotification();
        flushPendingIncomingCallNavigation();
        return;
      }

      await enablePushNotificationsOnLogin();
      await handleColdStartNotification();
      flushPendingPushNavigation();
      flushPendingIncomingCallNavigation();
    })();
  }, [isBootstrapping, userId]);

  return null;
}
