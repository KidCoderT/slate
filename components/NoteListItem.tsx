import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  title: string
  preview: string
  updatedAt: string
  showDivider?: boolean
  onPress: () => void
  onLongPress: () => void
}

export function NoteListItem({
  title,
  preview,
  updatedAt,
  showDivider = true,
  onPress,
  onLongPress,
}: Props) {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.65}
        style={{ paddingVertical: 14, paddingHorizontal: 16 }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: '#1A1A1A',
            letterSpacing: -0.2,
            marginBottom: 4,
          }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            color: '#ADADAB',
            lineHeight: 18,
          }}
        >
          {preview}
        </Text>
      </TouchableOpacity>

      {showDivider && (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: '#E8E8E6',
            marginLeft: 16,
          }}
        />
      )}
    </View>
  )
}
