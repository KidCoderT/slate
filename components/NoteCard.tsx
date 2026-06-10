import { Text } from '@/components/ui/Text'
import { shadows } from '@/theme/shadows'
import { TouchableOpacity, View } from 'react-native'

type Props = {
  title: string
  preview: string
  updatedAt: string
  isNew?: boolean
  onPress: () => void
  onLongPress: () => void
}

export function NoteCard({ title, preview, isNew = false, onPress, onLongPress }: Props) {
  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.88}
        className="bg-surface rounded-2xl p-4 flex-1"
        style={shadows.noteCard}
      >
        <Text variant="title" numberOfLines={1} className="mb-[6px]">
          {title}
        </Text>
        <Text variant="caption" numberOfLines={3} className="leading-[19px]">
          {preview}
        </Text>
      </TouchableOpacity>

      {/* Unread dot — absolutely positioned so it overlays the card without shifting layout */}
      {isNew && (
        <View
          className='absolute top-4 right-2 w-1 h-1 rounded bg-ink'
        />
      )}
    </View>
  )
}
