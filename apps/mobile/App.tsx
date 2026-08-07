import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { CameraCaptureHost } from "./src/components/CameraCaptureHost";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAuthStore } from "./src/store/authStore";
import { useLocaleStore } from "./src/store/localeStore";
import { handleColdStartNotification } from "./src/services/push-notifications";

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const bootstrapLocale = useLocaleStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrapLocale();
    void (async () => {
      await handleColdStartNotification();
      await bootstrap();
    })();
  }, [bootstrap, bootstrapLocale]);

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
        <CameraCaptureHost />
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
