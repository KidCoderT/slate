import { Divider } from '@/components/ui/Divider'
import { Text } from '@/components/ui/Text'
import type { ReactNode } from 'react'
import { TouchableOpacity, View } from 'react-native'

type Props = {
  title: string
  preview: string
  updatedAt: string
  showDivider?: boolean
  isNew?: boolean
  badge?: ReactNode
  onPress: () => void
  onLongPress?: () => void
}

export function NoteListItem({
  title,
  preview,
  updatedAt,
  showDivider = true,
  isNew = false,
  badge,
  onPress,
  onLongPress,
}: Props) {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.65}
        className="py-[18px] px-4 flex-row items-center"
      >
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text variant="title" numberOfLines={1} className="shrink">
              {title}
            </Text>
            {badge && <View className="ml-2 shrink-0">{badge}</View>}
          </View>
          <Text variant="caption" numberOfLines={1} className="text-ink-muted leading-[18px]">
            {preview}
          </Text>
        </View>

        {/* Unread dot — visible only for newly shared notes the user hasn't opened yet */}
        {isNew && (
          <View className="w-1.5 h-1.5 rounded-full bg-ink ml-3 shrink-0" />
        )}
      </TouchableOpacity>

      {showDivider && <Divider />}
    </View>
  )
}
