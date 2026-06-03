import { Text } from '@/components/ui/Text'
import { shadows } from '@/theme/shadows'
import { Folder } from 'lucide-react-native'
import { TouchableOpacity, View } from 'react-native'

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
      className="bg-surface rounded-2xl p-4 flex-1 flex-row items-center gap-3"
      style={shadows.noteCard}
    >
      <Folder size={22} color="#ADADAB" /* token: icon */ strokeWidth={1.5} />
      <View className="flex-1">
        <Text variant="title" numberOfLines={1} className="mb-[2px]">
          {name}
        </Text>
        <Text variant="caption">
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
