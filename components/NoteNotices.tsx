import { Text } from '@/components/ui/Text'
import type { ThemeColors } from '@/theme/colors'
import { useThemeColors } from '@/theme/ThemeProvider'
import { useMemo } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

type NoteNoticesProps = {
  /** Ambient offline strip — canvas-toned, signals state rather than action. */
  offline: boolean
  /** Ambient one-line notices, rendered in order. Compose + filter in the screen. */
  notices: string[]
  /** Pending edit request (pen-holder only) — the one actionable interrupt. */
  requestFrom: string | null
  onHandOver: () => void
  onKeep: () => void
}

/**
 * The floating notice cluster for the note screen. Notices FLOAT over the
 * content (the parent positions this absolutely) — the writing surface never
 * reflows because a banner appeared (APP_AESTHETIC: meditative, unhurried).
 */
export function NoteNotices({ offline, notices, requestFrom, onHandOver, onKeep }: NoteNoticesProps) {
  const colors = useThemeColors()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {offline && (
        <View style={styles.offlineBanner}>
          <Text variant="caption" className="text-ink-muted" style={styles.centeredLine}>
            Offline — reconnecting…
          </Text>
        </View>
      )}

      {notices.map((line) => (
        <View key={line} style={styles.banner}>
          <Text variant="caption" className="text-ink-muted" style={styles.centeredLine}>
            {line}
          </Text>
        </View>
      ))}

      {requestFrom && (
        <View style={styles.banner}>
          <Text variant="caption" className="text-ink" style={{ flex: 1 }}>
            {requestFrom} wants to edit
          </Text>
          <TouchableOpacity
            onPress={onKeep}
            style={styles.bannerAction}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Text variant="caption" className="text-ink-muted">Keep</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onHandOver}
            style={styles.bannerAction}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Text variant="caption" className="text-ink font-semibold">Hand over</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  // Whisper shadow (§6 note-list values) so the strip reads as a floating layer.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  // Canvas background reads as ambient/structural rather than the surface-white
  // of action banners. Signals state, not an action needed.
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  centeredLine: {
    flex: 1,
    textAlign: 'center',
  },
  // Visual size stays modest; hitSlop stretches the effective tap target to
  // ~44px — this is the one time-pressured interaction in the app.
  bannerAction: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
})
