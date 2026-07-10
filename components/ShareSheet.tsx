import { Divider } from '@/components/ui/Divider'
import { Text } from '@/components/ui/Text'
import { useProfileContext } from '@/context/ProfileContext'
import { useShares } from '@/hooks/useShares'
import { PUBLIC_BASE_URL } from '@/lib/constants'
import { AVATAR_TEXT, avatarColorFor } from '@/theme/avatarColors'
import type { ThemeColors } from '@/theme/colors'
import { useThemeColors } from '@/theme/ThemeProvider'
import type { Share } from '@/types/db'
import * as Clipboard from 'expo-clipboard'
import { Copy, Link2, X } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Keyboard,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
  visible: boolean
  onClose: () => void
  fileName: string
  fileId: string
}

function initialOf(text: string): string {
  return (text.trim()[0] ?? '?').toUpperCase()
}

const ANIM_IN_MS = 240
const ANIM_OUT_MS = 200

export function ShareSheet({ visible, onClose, fileName, fileId }: Props) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { profile } = useProfileContext()
  const { shares, addShare, removeShare, setPermission, isPublic, publicSlug, togglePublic } =
    useShares('file', fileId, fileName)
  const publicUrl = publicSlug ? `${PUBLIC_BASE_URL}/s/${publicSlug}` : null

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleCopy() {
    if (!publicUrl) return
    await Clipboard.setStringAsync(publicUrl)
    setNotice('Link copied.')
  }

  // Keep the Modal mounted through the exit animation, then unmount.
  const [mounted, setMounted] = useState(visible)

  // Animation drivers (native driver — transforms + opacity only).
  const overlay = useRef(new Animated.Value(0)).current
  // Start off-screen (large) so the sheet never flashes at its resting spot before
  // the entrance animation — runEnter resets this to the measured height first.
  const translateY = useRef(new Animated.Value(800)).current
  const keyboardOffset = useRef(new Animated.Value(0)).current
  const sheetHeight = useRef(0)
  const hasEnteredFor = useRef<string | null>(null) // tracks the open we've animated in

  // Open: mount, then animate in once we know the sheet height (in onLayout).
  useEffect(() => {
    if (visible) {
      setMounted(true)
    } else if (mounted) {
      // Animate out, then unmount.
      Animated.parallel([
        Animated.timing(overlay, { toValue: 0, duration: ANIM_OUT_MS, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: sheetHeight.current || 600,
          duration: ANIM_OUT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        hasEnteredFor.current = null
        setMounted(false)
      })
    }
  }, [visible, mounted, overlay, translateY])

  // Lift the sheet so the email input clears the keyboard. The sheet is anchored
  // to bottom:0, so shifting up by the keyboard height sits it just above the keys.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const onShow = (e: { endCoordinates: { height: number } }) => {
      const offset = Math.max(0, e.endCoordinates.height - insets.bottom)
      Animated.timing(keyboardOffset, { toValue: offset, duration: 200, useNativeDriver: true }).start()
    }
    const onHide = () => {
      Animated.timing(keyboardOffset, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    }
    const showSub = Keyboard.addListener(showEvt, onShow)
    const hideSub = Keyboard.addListener(hideEvt, onHide)
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [insets.bottom, keyboardOffset])

  function runEnter() {
    overlay.setValue(0)
    translateY.setValue(sheetHeight.current || 600)
    Animated.parallel([
      Animated.timing(overlay, { toValue: 1, duration: ANIM_IN_MS, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIM_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }

  function handleSheetLayout(e: LayoutChangeEvent) {
    sheetHeight.current = e.nativeEvent.layout.height
    // Run the entrance once per open, after we know the height.
    if (visible && hasEnteredFor.current !== fileId) {
      hasEnteredFor.current = fileId
      runEnter()
    }
  }

  function requestClose() {
    Keyboard.dismiss()
    onClose()
  }

  async function handleSend() {
    if (sending) return
    setSending(true)
    setNotice(null)
    const result = await addShare(email)
    setSending(false)
    if (result.ok) {
      setEmail('')
      setNotice(result.existingUser ? 'Shared — they’ve been notified.' : 'Invite sent by email.')
    } else {
      setNotice(result.message)
    }
  }

  if (!mounted) return null

  // Final sheet translate = open/close slide, lifted by the keyboard offset.
  const sheetTranslate = Animated.subtract(translateY, keyboardOffset)

  return (
    <Modal visible transparent animationType="none" onRequestClose={requestClose} statusBarTranslucent>
      {/* Overlay — fades independently of the sheet */}
      <Animated.View style={[styles.overlay, { opacity: overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
      </Animated.View>

      {/* Sheet — slides up independently */}
      <Animated.View
        onLayout={handleSheetLayout}
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetTranslate }] },
        ]}
      >
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text variant="title" numberOfLines={1}>{fileName || 'Untitled'}</Text>
          <TouchableOpacity onPress={requestClose} activeOpacity={0.65} style={styles.closeButton}>
            <X size={20} color={colors.ink} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Email input row */}
        <View style={styles.inputRow}>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); if (notice) setNotice(null) }}
            placeholder="Add email address..."
            placeholderTextColor={colors.placeholder}
            style={styles.emailInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            selectionColor={colors.ink}
            returnKeyType="done"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity onPress={handleSend} activeOpacity={0.75} style={styles.sendButton} disabled={sending}>
            {/* Explicit dark colour — the send button is an `ink` (near-white) fill in Direction B */}
            <Text style={[styles.sendButtonText, { color: colors.canvas }]}>{sending ? '…' : 'Send'}</Text>
          </TouchableOpacity>
        </View>

        {notice && (
          <Text variant="caption" className="text-ink-muted mt-2 px-1">{notice}</Text>
        )}

        {/* People with access */}
        <Text variant="label" className="mt-5 mb-3 px-1">People with access</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled">
          {/* Owner row (always first) */}
          {profile && (
            <OwnerRow
              name={profile.display_name ?? profile.email}
              email={profile.email}
              color={profile.color}
            />
          )}

          {shares.map((share) => (
            <View key={share.id}>
              <Divider inset={60} />
              <ShareRow
                share={share}
                onTogglePermission={() =>
                  setPermission(share.id, share.permission === 'edit' ? 'view' : 'edit')
                }
                onRemove={() => removeShare(share.id)}
              />
            </View>
          ))}
        </ScrollView>

        <View style={{ marginTop: 16, marginBottom: 16 }}>
          <Divider />
        </View>

        {/* Public link — view-only. Anyone with the link reads it, no account needed. */}
        <View style={styles.linkRow}>
          <Link2 size={16} color={colors.icon} strokeWidth={1.5} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="title">Public link</Text>
            <Text variant="caption" className="text-icon">
              {isPublic ? 'Anyone with the link can view' : 'Only people you invite'}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={togglePublic}
            trackColor={{ false: colors.divider, true: colors.ink }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.divider}
          />
        </View>

        {isPublic && publicUrl && (
          <TouchableOpacity onPress={handleCopy} activeOpacity={0.65} style={styles.copyRow}>
            <Text variant="caption" className="text-ink" style={{ flex: 1 }} numberOfLines={1}>
              {publicUrl}
            </Text>
            <Copy size={16} color={colors.icon} strokeWidth={1.5} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </Modal>
  )
}

function OwnerRow({ name, email, color }: { name: string; email: string; color: string }) {
  const colors = useThemeColors()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.collaboratorRow}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={[styles.avatarInitial, { color: AVATAR_TEXT }]}>{initialOf(name)}</Text>
      </View>
      <View style={styles.collaboratorInfo}>
        <Text variant="title" numberOfLines={1}>{name}</Text>
        <Text variant="caption" className="text-icon" numberOfLines={1}>{email}</Text>
      </View>
      <View style={styles.ownerChip}>
        <Text className="text-ink-subtle" style={styles.ownerChipText}>Owner</Text>
      </View>
    </View>
  )
}

type ShareRowProps = {
  share: Share
  onTogglePermission: () => void
  onRemove: () => void
}

function ShareRow({ share, onTogglePermission, onRemove }: ShareRowProps) {
  const colors = useThemeColors()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const label = share.invited_email ?? '—'
  const status = share.shared_with ? 'Has an account' : 'Invite pending'
  return (
    <View style={styles.collaboratorRow}>
      <View style={[styles.avatar, { backgroundColor: avatarColorFor(label) }]}>
        <Text style={[styles.avatarInitial, { color: AVATAR_TEXT }]}>{initialOf(label)}</Text>
      </View>
      <View style={styles.collaboratorInfo}>
        <Text variant="title" numberOfLines={1}>{label}</Text>
        <Text variant="caption" className="text-icon" numberOfLines={1}>{status}</Text>
      </View>

      <TouchableOpacity onPress={onTogglePermission} activeOpacity={0.65}>
        <View style={[styles.permChip, share.permission === 'edit' ? styles.permChipEdit : styles.permChipView]}>
          <Text style={[styles.permChipText, share.permission === 'edit' ? { color: colors.canvas } : undefined]}>
            {share.permission === 'edit' ? 'Edit' : 'View'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={onRemove} activeOpacity={0.6} style={styles.removeButton} hitSlop={8}>
        <X size={16} color={colors.icon} strokeWidth={1.5} />
      </TouchableOpacity>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.crumb,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.canvas,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.ink,
  },
  sendButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  collaboratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  collaboratorInfo: {
    flex: 1,
  },
  ownerChip: {
    backgroundColor: colors.canvas,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ownerChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  permChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  permChipEdit: {
    backgroundColor: colors.ink,
  },
  permChipView: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  permChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    marginLeft: 10,
    padding: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
  },
})
