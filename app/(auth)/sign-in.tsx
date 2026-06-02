import { useSSO } from '@clerk/expo'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'

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
    <View className="flex-1 bg-white items-center justify-center px-8">
      <Text className="text-4xl font-bold text-[#1A1A1A] mb-2">Slate</Text>
      <Text className="text-base text-[#6B6B6B] mb-16">Notes, shared simply.</Text>

      <TouchableOpacity
        onPress={handleGoogleLogin}
        disabled={loading}
        className="w-full bg-[#1A1A1A] py-4 rounded-xl items-center"
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text className="text-white font-semibold text-base">Continue with Google</Text>
        }
      </TouchableOpacity>
    </View>
  )
}