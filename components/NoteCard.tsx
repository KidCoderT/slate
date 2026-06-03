import { Text } from '@/components/ui/Text'
import { shadows } from '@/theme/shadows'
import { TouchableOpacity } from 'react-native'

type Props = {
  title: string
  preview: string
  updatedAt: string
  onPress: () => void
  onLongPress: () => void
}

export function NoteCard({ title, preview, onPress, onLongPress }: Props) {
  return (
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
  )
}
