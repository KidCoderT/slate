import { Text } from '@/components/ui/Text'
import { TouchableOpacity, View } from 'react-native'

type Props = {
  initial: string
  onPress: () => void
  /** The user's identity colour (theme/avatarColors.ts). Falls back to `ink` when absent. */
  backgroundColor?: string
  /** Show an unread dot when the user has shared notes they haven't opened yet. */
  hasUnread?: boolean
}

export function ProfileButton({ initial, onPress, backgroundColor, hasUnread = false }: Props) {
  return (
    <View style={{ position: 'relative' }}>
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

      {/* Unread dot — sits just outside the avatar rim at top-right.
          The canvas border creates a gap ring between the dot and the avatar. */}
      {hasUnread && (
        <View className="absolute -top-px -right-px w-2 h-2 rounded-full bg-ink border-[1.5px] border-canvas" />
      )}
    </View>
  )
}
