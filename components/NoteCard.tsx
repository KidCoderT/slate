import { Text, TouchableOpacity, View } from 'react-native'

type Props = {
  title: string
  preview: string
  updatedAt: string
  onPress: () => void
  onLongPress: () => void
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 8,
  elevation: 3,
}

export function NoteCard({ title, preview, onPress, onLongPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.88}
      style={[
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          flex: 1,
        },
        CARD_SHADOW,
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#1A1A1A',
          letterSpacing: -0.2,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      <Text
        numberOfLines={3}
        style={{
          fontSize: 13,
          color: '#9E9890',
          lineHeight: 19,
        }}
      >
        {preview}
      </Text>
    </TouchableOpacity>
  )
}

export { CARD_SHADOW }
