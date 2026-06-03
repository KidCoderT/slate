import { Text } from '@/components/ui/Text'
import { useSSO } from '@clerk/expo'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Platform, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SignIn() {
  const { startSSOFlow } = useSSO()
  const router = useRouter()
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
    } catch (err) {
      console.error('OAuth error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas items-center justify-center px-8">
      <Text
        variant="wordmark"
        style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
        className="mb-2"
      >
        Slate
      </Text>
      <Text variant="body" className="text-ink-subtle mb-16">
        Notes, shared simply.
      </Text>

      <TouchableOpacity
        onPress={handleGoogleLogin}
        disabled={loading}
        className="w-full bg-ink py-4 rounded-xl items-center"
      >
        {loading
          ? <ActivityIndicator color="#FFFFFF" /* token: surface */ />
          : <Text variant="title" className="text-surface">Continue with Google</Text>
        }
      </TouchableOpacity>
    </SafeAreaView>
  )
}
