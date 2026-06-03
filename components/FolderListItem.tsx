import { Divider } from '@/components/ui/Divider'
import { Text } from '@/components/ui/Text'
import { Folder } from 'lucide-react-native'
import { TouchableOpacity, View } from 'react-native'

type Props = {
  name: string
  noteCount: number
  showDivider?: boolean
  onPress: () => void
}

export function FolderListItem({ name, noteCount, showDivider = true, onPress }: Props) {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.65}
        className="py-[14px] px-4 flex-row items-center gap-3"
      >
        <Folder size={20} color="#ADADAB" strokeWidth={1.5} />
        <View className="flex-1">
          <Text variant="title" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" className="text-icon mt-[2px]">
            {noteCount} {noteCount === 1 ? 'note' : 'notes'}
          </Text>
        </View>
      </TouchableOpacity>

      {showDivider && <Divider />}
    </View>
  )
}
