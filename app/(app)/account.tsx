import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { Text } from '@/components/ui/Text'
import { useProfileContext } from '@/context/ProfileContext'
import type { ThemePref } from '@/lib/themeStore'
import { AVATAR_COLORS } from '@/theme/avatarColors'
import { useTheme, useThemeColors } from '@/theme/ThemeProvider'
import { useClerk } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

const THEME_OPTIONS: { key: ThemePref; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
]

export default function Account() {
  const { signOut } = useClerk()
  const router = useRouter()
  const { profile, updateColor } = useProfileContext()
  const colors = useThemeColors()
  const { pref, setPref } = useTheme()

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
                  // Selected ring — a 2px inset border in the themed ink.
                  selected && { borderWidth: 2, borderColor: colors.ink },
                ]}
              />
            )
          })}
        </View>
      </Card>

      {/* ── Appearance (light / dark) ── */}
      <Card className="mb-[30px]">
        <Text variant="label" className="mb-[14px]">Appearance</Text>
        <View className="flex-row" style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => {
            const active = pref === opt.key
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setPref(opt.key)}
                activeOpacity={0.75}
                className={
                  active
                    ? 'flex-1 items-center py-2.5 rounded-lg bg-ink'
                    : 'flex-1 items-center py-2.5 rounded-lg border border-divider'
                }
              >
                <Text variant="title" inverted={active} className="text-[14px]">
                  {opt.label}
                </Text>
              </TouchableOpacity>
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
  themeRow: {
    gap: 8,
  },
})
