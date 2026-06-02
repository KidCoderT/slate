import { Ionicons } from '@expo/vector-icons'
import { Platform, TouchableOpacity } from 'react-native'

type Props = {
  onPress: () => void
}

export function FAB({ onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        {
          position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
          bottom: 36,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#1A1A1A',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.22,
          shadowRadius: 10,
          elevation: 8,
        },
      ]}
    >
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </TouchableOpacity>
  )
}
