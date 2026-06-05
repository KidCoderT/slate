import { Text } from '@/components/ui/Text'
import { TouchableOpacity } from 'react-native'

type Props = {
  initial: string
  onPress: () => void
  /** The user's identity colour (theme/avatarColors.ts). Falls back to `ink` when absent. */
  backgroundColor?: string
}

export function ProfileButton({ initial, onPress, backgroundColor }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="w-9 h-9 rounded-full bg-ink items-center justify-center"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <Text className="text-surface text-[14px] font-semibold tracking-[0.3px]">
        {initial}
      </Text>
    </TouchableOpacity>
  )
}
