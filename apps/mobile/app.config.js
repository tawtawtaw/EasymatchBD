const appJson = require("./app.json");
const fs = require("fs");
const path = require("path");

const EAS_PROJECT_ID = "0980635d-027a-4d94-80ee-8320c084d15a";
const googleServicesPath = path.join(__dirname, "google-services.json");

if (!fs.existsSync(googleServicesPath) && process.env.EAS_BUILD === "true") {
  throw new Error(
    "google-services.json is missing from apps/mobile. Android push requires this file on EAS Build.",
  );
}

module.exports = () => {
  const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "").trim();
  const webUrl = (process.env.EXPO_PUBLIC_WEB_URL || "").trim();
  const videoCallWebUrl = (process.env.EXPO_PUBLIC_VIDEO_CALL_WEB_URL || "").trim();
  const buildProfile = (process.env.EAS_BUILD_PROFILE || "").trim();
  const includeDevClient = buildProfile === "development";

  const plugins = (appJson.expo.plugins || []).filter((entry) => {
    const name = Array.isArray(entry) ? entry[0] : entry;
    return includeDevClient || name !== "expo-dev-client";
  });

  plugins.push([
    "expo-build-properties",
    {
      android: {
        newArchEnabled: false,
      },
      ios: {
        newArchEnabled: false,
      },
    },
  ]);

  return {
    expo: {
      ...appJson.expo,
      android: {
        ...appJson.expo.android,
        googleServicesFile: "./google-services.json",
      },
      plugins,
      extra: {
        ...(appJson.expo.extra || {}),
        apiBaseUrl: apiUrl,
        webBaseUrl: webUrl,
        videoCallWebBaseUrl: videoCallWebUrl || webUrl,
        eas: {
          ...(appJson.expo.extra?.eas || {}),
          projectId: EAS_PROJECT_ID,
        },
      },
    },
  };
};
