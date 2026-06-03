import { Divider } from '@/components/ui/Divider'
import { Text } from '@/components/ui/Text'
import { TouchableOpacity, View } from 'react-native'

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
        className="py-[14px] px-4"
      >
        <Text variant="title" numberOfLines={1} className="mb-1">
          {title}
        </Text>
        <Text variant="caption" numberOfLines={1} className="text-icon leading-[18px]">
          {preview}
        </Text>
      </TouchableOpacity>

      {showDivider && <Divider />}
    </View>
  )
}
