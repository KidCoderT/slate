import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { Text } from '@/components/ui/Text'
import { useThemeColors } from '@/theme/ThemeProvider'
import { useSSO } from '@clerk/expo'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, TouchableOpacity, View } from 'react-native'

export default function SignIn() {
  const { startSSOFlow } = useSSO()
  const router = useRouter()
  const colors = useThemeColors()
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Linking.createURL('/'),
      })

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        router.replace('/')
      }
    } catch {
      // OAuth was cancelled or failed — leave the user on the sign-in screen to retry.
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenContainer className="flex-1 justify-center" padded>
      {/* Editorial hero — left-aligned, structural rule as signature (APP_AESTHETIC §5) */}
      <View className="mb-14">
        <Text variant="wordmark">Slate</Text>
        <View className="h-px bg-crumb w-11 my-4" />
        <Text variant="body" className="text-ink-subtle">
          Notes, shared simply.
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleGoogleLogin}
        disabled={loading}
        activeOpacity={0.85}
        className="w-full bg-ink py-4 rounded-xl items-center"
      >
        {loading
          ? <ActivityIndicator color={colors.canvas} />
          : <Text variant="title" inverted>Continue with Google</Text>
        }
      </TouchableOpacity>
    </ScreenContainer>
  )
}
