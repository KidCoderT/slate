// EAS sets EAS_BUILD_PROFILE to the eas.json build profile name during `eas build`
// (development / preview / production). Local `expo start` has no profile → falls
// back to the production name.
const NAME_BY_PROFILE = {
  development: "Slate (Dev)",
  preview: "Slate (BETA)",
  production: "Slate",
};

const appName = NAME_BY_PROFILE[process.env.EAS_BUILD_PROFILE] ?? "Slate";

module.exports = {
  expo: {
    name: appName,
    slug: "slate",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "slate",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      associatedDomains: ["applinks:slateapp.expo.app"],
    },
    android: {
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.tejas.slate",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "slateapp.expo.app",
              pathPrefix: "/note",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
      bundler: "metro",
    },
    plugins: [
      "./plugins/withAndroidPackagingExcludes",
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-secure-store",
      "expo-web-browser",
      "expo-notifications",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "c803f557-e3cb-4eb8-b281-bbbeeb29c203",
      },
    },
    owner: "tejasbuilds",
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/c803f557-e3cb-4eb8-b281-bbbeeb29c203",
    },
  },
};
