import { Text } from '@/components/ui/Text'
import { TouchableOpacity } from 'react-native'

type Props = {
  initial: string
  onPress: () => void
}

export function ProfileButton({ initial, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="w-9 h-9 rounded-full bg-ink items-center justify-center"
    >
      <Text className="text-surface text-[14px] font-semibold tracking-[0.3px]">
        {initial}
      </Text>
    </TouchableOpacity>
  )
}
