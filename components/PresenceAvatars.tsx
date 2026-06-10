import { Text } from '@/components/ui/Text'
import { colors } from '@/theme/colors'
import { StyleSheet, View } from 'react-native'

type PresenceUser = {
  id: string
  initial: string
  color: string
  editing?: boolean
  isSelf?: boolean
}

type Props = {
  users: PresenceUser[]
  maxVisible?: number
}

export function PresenceAvatars({ users, maxVisible = 2 }: Props) {
  const sorted = [...users].sort((a, b) => Number(b.editing) - Number(a.editing))
  const visible = sorted.slice(0, maxVisible)
  const overflow = Math.max(0, sorted.length - maxVisible)

  return (
    <View style={styles.row}>
      {visible.map((user, i) => (
        <View
          key={user.id}
          style={[
            styles.avatar,
            user.editing && styles.editingAvatar,
            user.isSelf && !user.editing && styles.selfAvatar,
            {
              backgroundColor: user.color,
              marginLeft: i > 0 ? -8 : 0,
              zIndex: user.editing ? visible.length + 1 : visible.length - i,
            },
          ]}
        >
          <Text style={styles.initial} className="text-surface">
            {user.initial}
          </Text>
          {user.editing && <View style={styles.liveDot} />}
        </View>
      ))}

      {overflow > 0 && (
        <View style={[styles.avatar, styles.overflowBubble]}>
          <Text style={styles.initial} className="text-ink">
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  editingAvatar: {
    borderColor: colors.ink,
  },
  selfAvatar: {
    borderColor: colors.crumb,
  },
  overflowBubble: {
    backgroundColor: colors.divider,
    marginLeft: -8,
    zIndex: 0,
  },
  initial: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  liveDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.presence, // live presence colour exception
    borderWidth: 1.5,
    borderColor: colors.canvas,
  },
})
