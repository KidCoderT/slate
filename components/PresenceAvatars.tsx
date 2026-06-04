import { StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'

type PresenceUser = {
  id:      string
  initial: string
  color:   string
}

type Props = {
  users:       PresenceUser[]
  maxVisible?: number
}

export function PresenceAvatars({ users, maxVisible = 2 }: Props) {
  const visible  = users.slice(0, maxVisible)
  const overflow = users.length - maxVisible

  return (
    <View style={styles.row}>
      {visible.map((user, i) => (
        <View
          key={user.id}
          style={[
            styles.avatar,
            { backgroundColor: user.color, marginLeft: i > 0 ? -8 : 0, zIndex: visible.length - i },
          ]}
        >
          <Text style={styles.initial} className="text-surface">
            {user.initial}
          </Text>
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
    alignItems:    'center',
  },
  avatar: {
    width:          26,
    height:         26,
    borderRadius:   13,
    borderWidth:    2,
    borderColor:    '#F0F1F4', // canvas token
    alignItems:     'center',
    justifyContent: 'center',
  },
  overflowBubble: {
    backgroundColor: '#E8E8E6', // divider token
    marginLeft:      -8,
    zIndex:          0,
  },
  initial: {
    fontSize:   10,
    fontWeight: '600',
    lineHeight: 12,
  },
})
