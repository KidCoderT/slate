import { Ionicons } from '@expo/vector-icons'
import { Text, TouchableOpacity, View } from 'react-native'
import { CARD_SHADOW } from './NoteCard'

type Props = {
  name: string
  noteCount: number
  onPress: () => void
}

export function FolderCard({ name, noteCount, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        CARD_SHADOW,
      ]}
    >
      <Ionicons name="folder-outline" size={22} color="#ADADAB" />
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: '#1A1A1A',
            letterSpacing: -0.2,
            marginBottom: 2,
          }}
        >
          {name}
        </Text>
        <Text style={{ fontSize: 12, color: '#ADADAB' }}>
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
