import { Text } from '@/components/ui/Text'
import { AVATAR_TEXT } from '@/theme/avatarColors'
import type { ThemeColors } from '@/theme/colors'
import { useThemeColors } from '@/theme/ThemeProvider'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Platform, StyleSheet, View } from 'react-native'

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

type Styles = ReturnType<typeof makeStyles>

const FADE_MS = 150 // APP_AESTHETIC §8 — the one sanctioned fade duration

/** One avatar bubble that fades in on mount and out when leaving. */
function Avatar({ user, index, count, leaving, styles }: {
  user: PresenceUser
  index: number
  count: number
  leaving: boolean
  styles: Styles
}) {
  const opacity = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: leaving ? 0 : 1,
      duration: FADE_MS,
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }, [leaving, opacity])

  return (
    <Animated.View
      style={[
        styles.avatar,
        user.editing && styles.editingAvatar,
        user.isSelf && !user.editing && styles.selfAvatar,
        {
          opacity,
          backgroundColor: user.color,
          marginLeft: index > 0 ? -8 : 0,
          zIndex: user.editing ? count + 1 : count - index,
        },
      ]}
    >
      <Text style={[styles.initial, { color: AVATAR_TEXT }]}>
        {user.initial}
      </Text>
      {user.editing && <View style={styles.liveDot} />}
    </Animated.View>
  )
}

export function PresenceAvatars({ users, maxVisible = 2 }: Props) {
  const colors = useThemeColors()
  const styles = useMemo(() => makeStyles(colors), [colors])

  // Keep just-departed avatars around for one fade so they dissolve instead of
  // popping out. Ghosts are dropped after the fade completes.
  const prevUsersRef = useRef<PresenceUser[]>([])
  const [ghosts, setGhosts] = useState<PresenceUser[]>([])
  useEffect(() => {
    const gone = prevUsersRef.current.filter((p) => !users.some((u) => u.id === p.id))
    prevUsersRef.current = users
    // Anyone who came back mid-fade stops being a ghost immediately.
    setGhosts((g) => [...g.filter((x) => !users.some((u) => u.id === x.id)), ...gone])
    if (gone.length === 0) return
    const t = setTimeout(
      () => setGhosts((g) => g.filter((x) => !gone.some((d) => d.id === x.id))),
      FADE_MS + 20,
    )
    return () => clearTimeout(t)
  }, [users])

  const ghostIds = new Set(ghosts.map((g) => g.id))
  const sorted = [...users, ...ghosts].sort((a, b) => Number(b.editing) - Number(a.editing))
  const visible = sorted.slice(0, maxVisible)
  const overflow = Math.max(0, sorted.length - maxVisible)

  return (
    <View style={styles.row}>
      {visible.map((user, i) => (
        <Avatar
          key={user.id}
          user={user}
          index={i}
          count={visible.length}
          leaving={ghostIds.has(user.id)}
          styles={styles}
        />
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

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
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
