import { colors } from '@/theme/colors'
import { Platform, StyleSheet, TouchableOpacity } from 'react-native'
import { Plus } from 'lucide-react-native'

type Props = {
  onPress: () => void
}

// StyleSheet required for shadow + web position:fixed — NativeWind cannot express these on React Native
const styles = StyleSheet.create({
  fab: {
    // position: 'fixed' is web-only; cast required since React Native types don't include it
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    bottom: 36,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
})

export function FAB({ onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="bg-ink"
      style={styles.fab}
    >
      <Plus size={28} color={colors.surface} strokeWidth={1.5} />
    </TouchableOpacity>
  )
}
