import { Text } from '@/components/ui/Text'
import { useThemeColors } from '@/theme/ThemeProvider'
import { Plus } from 'lucide-react-native'
import { useRef } from 'react'
import { Animated, Platform, Pressable, StyleSheet } from 'react-native'

type Props = {
  onPress: () => void
  label?: string
}

// The primary action — a bottom-anchored `ink` "New note" pill, not a Material circle
// (APP_AESTHETIC §5). The one genuinely elevated element (real shadow, §6) and the one
// signature micro-interaction: a crisp spring press-scale (§8).
// StyleSheet required for position:fixed (web) + shadow — NativeWind can't express these.
const styles = StyleSheet.create({
  wrap: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    bottom: 28,
    right: 18,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
})

export function FAB({ onPress, label = 'New note' }: Props) {
  const colors = useThemeColors()
  const scale = useRef(new Animated.Value(1)).current
  const spring = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start()

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => spring(0.96)}
        onPressOut={() => spring(1)}
        style={[styles.pill, { backgroundColor: colors.ink }]}
      >
        <Plus size={20} color={colors.canvas} strokeWidth={1.5} />
        <Text variant="title" inverted>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}
