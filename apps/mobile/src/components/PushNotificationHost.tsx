import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import {
  ensurePushNotificationsWhileLoggedOut,
  enablePushNotificationsOnLogin,
  flushPendingPushNavigation,
  handleColdStartNotification,
} from "../services/push-notifications";

/** Keeps push delivery working while logged out; registers token when logged in. */
export function PushNotificationHost() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!userId) {
      void ensurePushNotificationsWhileLoggedOut();
      return;
    }

    void (async () => {
      await enablePushNotificationsOnLogin();
      await handleColdStartNotification();
      flushPendingPushNavigation();
    })();
  }, [isBootstrapping, userId]);

  return null;
}
