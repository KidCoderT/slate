import { Text } from '@/components/ui/Text'
import { DOWNLOAD_URL } from '@/lib/constants'
import { Linking, Platform, TouchableOpacity, View } from 'react-native'

/**
 * "Get the app" prompt shown when a shared-note link is opened in a MOBILE BROWSER
 * without the app installed — the App-Link fallback surface (DESIGN §7: the recipient's
 * first-open must be flawless). Hidden on native (already in the app), on desktop web,
 * and when no download URL is configured (EXPO_PUBLIC_DOWNLOAD_URL — set after the build).
 */
export function GetAppBanner() {
  const isMobileWeb =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad/i.test(navigator.userAgent)

  if (!isMobileWeb || !DOWNLOAD_URL) return null

  return (
    <View className="mt-8 border border-divider rounded-xl p-4">
      <Text variant="title">Get the Slate app</Text>
      <Text variant="caption" className="mt-1">A faster, native way to read and write.</Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(DOWNLOAD_URL)}
        activeOpacity={0.85}
        className="mt-3 bg-ink py-3 rounded-xl items-center"
      >
        <Text variant="title" inverted>Download</Text>
      </TouchableOpacity>
    </View>
  )
}
