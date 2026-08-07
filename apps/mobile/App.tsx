import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { CameraCaptureHost } from "./src/components/CameraCaptureHost";
import { AndroidCallKeepHost } from "./src/components/AndroidCallKeepHost";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAuthStore } from "./src/store/authStore";
import { useLocaleStore } from "./src/store/localeStore";

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const bootstrapLocale = useLocaleStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrapLocale();
    void bootstrap();
  }, [bootstrap, bootstrapLocale]);

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
        <AndroidCallKeepHost />
        <CameraCaptureHost />
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
