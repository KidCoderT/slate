import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { Text } from '@/components/ui/Text'
import { useProfileContext } from '@/context/ProfileContext'
import { AVATAR_COLORS } from '@/theme/avatarColors'
import { colors } from '@/theme/colors'
import { useClerk } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

export default function Account() {
  const { signOut } = useClerk()
  const router = useRouter()
  const { profile, updateColor } = useProfileContext()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/sign-in')
  }

  return (
    <ScreenContainer padded>
      {/* ── Header ── */}
      <View className="mt-3 mb-9 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.65} className="mr-3">
          <ChevronLeft size={20} color={colors.ink} strokeWidth={1.5} />
        </TouchableOpacity>
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

        {/* Identity colour — the one permitted spot of colour (APP_AESTHETIC §2). */}
        <Text variant="label" className="mt-6 mb-[14px]">Colour</Text>
        <View className="flex-row" style={styles.swatchRow}>
          {AVATAR_COLORS.map((hex) => {
            const selected = profile?.color === hex
            return (
              <TouchableOpacity
                key={hex}
                onPress={() => updateColor(hex)}
                activeOpacity={0.7}
                style={[
                  styles.swatch,
                  { backgroundColor: hex },
                  selected && styles.swatchSelected,
                ]}
              />
            )
          })}
        </View>
      </Card>

      {/* ── Shared with me ── */}
      <Card noPad className="mb-[30px]">
        <TouchableOpacity
          onPress={() => router.push('/shared-with-me')}
          activeOpacity={0.65}
          className="py-[18px] px-4"
        >
          <Text variant="title">Shared with me</Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  swatchRow: {
    gap: 12,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  swatchSelected: {
    // Selected ring — a 2px inset border in ink, drawn as an outline.
    borderWidth: 2,
    borderColor: colors.ink,
  },
})
