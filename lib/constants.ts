import { Platform } from "react-native";

/**
 * Base origin for public note links (`${PUBLIC_BASE_URL}/s/<slug>`). On web we use the
 * live origin so a copied link matches wherever the build is served (localhost in dev,
 * the real domain in prod). Native has no origin, so it falls back to the deployed host.
 * ponytail: change the fallback to the real deployed web host before shipping.
 */
export const PUBLIC_BASE_URL =
  Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.origin
    : "https://slateapp.expo.app";

/**
 * Install link for the "Get the app" fallback banner (GetAppBanner). Set
 * EXPO_PUBLIC_DOWNLOAD_URL to the EAS build's install-page URL once the build exists
 * (Phase 4). Empty = banner hidden.
 */
export const DOWNLOAD_URL = process.env.EXPO_PUBLIC_DOWNLOAD_URL ?? "";
