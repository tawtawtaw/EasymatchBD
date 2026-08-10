import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { AppLockGate } from "./src/components/AppLockGate";
import { CameraCaptureHost } from "./src/components/CameraCaptureHost";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAppLockStore } from "./src/store/appLockStore";
import { useAuthStore } from "./src/store/authStore";
import { useLocaleStore } from "./src/store/localeStore";
import { handleColdStartNotification } from "./src/services/push-notifications";

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const bootstrapLocale = useLocaleStore((s) => s.bootstrap);
  const bootstrapAppLock = useAppLockStore((s) => s.bootstrap);
  const startWatchingAppLock = useAppLockStore((s) => s.startWatching);
  const stopWatchingAppLock = useAppLockStore((s) => s.stopWatching);

  useEffect(() => {
    void bootstrapLocale();
    startWatchingAppLock();
    void (async () => {
      // Resolve the lock before a session can exist, so the gate is already up
      // by the first frame that could show member data.
      await bootstrapAppLock();
      await handleColdStartNotification();
      await bootstrap();
    })();
    return () => stopWatchingAppLock();
  }, [
    bootstrap,
    bootstrapLocale,
    bootstrapAppLock,
    startWatchingAppLock,
    stopWatchingAppLock,
  ]);

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
        <CameraCaptureHost />
        <AppLockGate />
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
