import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { Text } from '@/components/ui/Text'
import { useProfile } from '@/hooks/useProfile'
import { useClerk } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { TouchableOpacity, View } from 'react-native'

export default function Account() {
  const { signOut } = useClerk()
  const router = useRouter()
  const { profile } = useProfile()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/sign-in')
  }

  return (
    <ScreenContainer padded>
      {/* ── Header ── */}
      <View className="mt-3 mb-9">
        <Text variant="heading">Account</Text>
      </View>

      {/* ── Profile card ── */}
      <Card className="mb-[30px]">
        <Text variant="label" className="mb-[14px]">Profile</Text>
        <Text variant="heading-sm" className="mb-1">
          {profile?.display_name ?? '—'}
        </Text>
        <Text variant="caption">
          {profile?.email ?? '—'}
        </Text>
      </Card>

      {/* ── Sign out ── */}
      <TouchableOpacity
        onPress={handleSignOut}
        activeOpacity={0.75}
        className="border border-ink rounded-xl py-[14px] items-center"
      >
        <Text variant="title">Sign out</Text>
      </TouchableOpacity>
    </ScreenContainer>
  )
}
