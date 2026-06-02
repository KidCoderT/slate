import { useProfile } from '@/hooks/useProfile'
import { useClerk } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'

export default function Home() {
  const { signOut } = useClerk()
  const router = useRouter()
  const { profile, loading } = useProfile()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/sign-in')
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white px-8 pt-20">
      <Text className="text-3xl font-bold text-[#1A1A1A]">
        Hello, {profile?.display_name} 👋
      </Text>
      <Text className="text-[#6B6B6B] mt-2">Welcome to Slate.</Text>

      <TouchableOpacity
        onPress={handleSignOut}
        className="mt-12 border border-[#1A1A1A] py-3 px-6 rounded-xl self-start"
      >
        <Text className="text-[#1A1A1A] font-medium">Sign out</Text>
      </TouchableOpacity>
    </View>
  )
}