import { Ionicons } from '@expo/vector-icons'
import { Text, TouchableOpacity, View } from 'react-native'

type Props = {
  name: string
  noteCount: number
  onPress: () => void
}

export function FolderChip({ name, noteCount, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingVertical: 13,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <Ionicons name="folder-outline" size={19} color="#ADADAB" />
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#1A1A1A',
            letterSpacing: -0.2,
          }}
        >
          {name}
        </Text>
        <Text style={{ fontSize: 12, color: '#ADADAB', marginTop: 1 }}>
          {noteCount}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
