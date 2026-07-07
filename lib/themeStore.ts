import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Persist the theme preference without a new dependency: SecureStore on native,
// localStorage on web (SecureStore is unavailable there). A theme pref is not a secret,
// but SecureStore is already wired for Clerk, so we reuse it rather than add AsyncStorage.
const KEY = 'slate.theme-pref'

export type ThemePref = 'system' | 'light' | 'dark'

export async function loadThemePref(): Promise<ThemePref> {
  try {
    const v =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(KEY)
        : await SecureStore.getItemAsync(KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

export async function saveThemePref(pref: ThemePref): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, pref)
    else await SecureStore.setItemAsync(KEY, pref)
  } catch {
    // Persisting the theme is best-effort — a failure just means it resets next launch.
  }
}
