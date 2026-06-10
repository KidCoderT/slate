import { Text } from '@/components/ui/Text'
import { colors } from '@/theme/colors'
import { shadows } from '@/theme/shadows'
import { Folder } from 'lucide-react-native'
import { TouchableOpacity, View } from 'react-native'

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
      className="bg-surface rounded-[14px] py-[13px] px-[14px] flex-row items-center gap-[10px]"
      style={shadows.folderChip}
    >
      <Folder size={19} color={colors.icon} strokeWidth={1.5} />
      <View className="flex-1">
        <Text variant="title" numberOfLines={1} className="text-[14px]">
          {name}
        </Text>
        <Text variant="caption" className="text-icon mt-[1px] text-[12px]">
          {noteCount}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
