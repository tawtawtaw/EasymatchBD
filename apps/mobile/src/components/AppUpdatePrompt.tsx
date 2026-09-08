import { ANDROID_APP_DOWNLOAD_PATH, type PublicAndroidAppRelease } from "@easymatch/shared";
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { config } from "../config/env";
import { tAppUpdate } from "../i18n/app-update";
import { fillMessageTemplate } from "../i18n/messages";
import { installedAndroidVersionCode } from "../lib/installed-android-version";
import { openExternalAppUrl } from "../lib/webview-external-url";
import { getPublicAndroidAppRelease } from "../services/app-release";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

let dismissedVersionCode: number | null = null;

function downloadPageUrl(locale: string): string {
  return `${config.webBaseUrl}/${locale}${ANDROID_APP_DOWNLOAD_PATH}`;
}

function shouldPrompt(release: PublicAndroidAppRelease | null): boolean {
  if (Platform.OS !== "android") return false;
  if (!release?.available || release.versionCode == null) return false;
  if (dismissedVersionCode === release.versionCode) return false;
  const installed = installedAndroidVersionCode();
  if (installed <= 0) return false;
  return release.versionCode > installed;
}

export function AppUpdatePrompt() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tAppUpdate(locale);
  const [release, setRelease] = useState<PublicAndroidAppRelease | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPublicAndroidAppRelease().then((next) => {
      if (!cancelled) setRelease(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = shouldPrompt(release);

  async function handleDownload() {
    const opened = await openExternalAppUrl(downloadPageUrl(locale));
    if (opened && release?.versionCode != null) {
      dismissedVersionCode = release.versionCode;
      setRelease({ ...release });
    }
  }

  function handleLater() {
    if (release?.versionCode != null) {
      dismissedVersionCode = release.versionCode;
      setRelease({ ...release });
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleLater}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>
            {fillMessageTemplate(copy.body, {
              name: release?.versionName ?? "",
            })}
          </Text>
          <Pressable style={styles.primary} onPress={() => void handleDownload()}>
            <Text style={styles.primaryText}>{copy.download}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={handleLater}>
            <Text style={styles.secondaryText}>{copy.later}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(24, 24, 27, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 22,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.zinc900,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.zinc600,
    textAlign: "center",
  },
  primary: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  secondary: {
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.zinc600,
    fontWeight: "600",
    fontSize: 15,
  },
});
