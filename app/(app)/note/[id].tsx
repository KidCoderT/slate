import type { MarkdownEditorHandle } from '@/components/MarkdownEditorWeb'
import { MarkdownToolbar, type ToolbarAction } from '@/components/MarkdownToolbar'
import { NoteNotices } from '@/components/NoteNotices'
import { PresenceAvatars } from '@/components/PresenceAvatars'
import { ShareSheet } from '@/components/ShareSheet'
import { Divider } from '@/components/ui/Divider'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { Text } from '@/components/ui/Text'
import { useProfileContext } from '@/context/ProfileContext'
import { useFileSync } from '@/hooks/useFileSync'
import { type ThemeColors } from '@/theme/colors'
import { fonts } from '@/theme/fonts'
import { useThemeColors } from '@/theme/ThemeProvider'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Check, ChevronLeft, Share2 } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Platform-specific editor — the conditional require keeps the other platform's editor
// (and its dependency tree, e.g. react-native-webview) out of this platform's bundle.
const MarkdownEditorWeb = Platform.OS === 'web'
  ? require('@/components/MarkdownEditorWeb').MarkdownEditorWeb
  : null
const MarkdownEditorNative = Platform.OS !== 'web'
  ? require('@/components/MarkdownEditorNative').MarkdownEditorNative
  : null

export default function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const { profile } = useProfileContext()
  const {
    file,
    isLoading,
    error,
    title,
    setTitle,
    content,
    setContent,
    saveStatus,
    permission,
    discardIfEmpty,
    // Live editing
    lockState,
    acquire,
    release,
    requestEdit,
    pendingRequest,
    acceptRequest,
    declineRequest,
    ignoreRequest,
    requestState,
    presenceUsers,
    holderLeft,
    isOffline,
    accessRevoked,
  } = useFileSync(id)

  // Viewers (read-only share) can never edit; owners/editors hold the pen.
  const isViewer = permission === 'view'
  const isOwner = permission === 'owner'
  const canEditPermission = !isViewer
  const canEdit = !isViewer && lockState.status === 'me'
  const isLocked = lockState.status === 'other'
  const lockedBy = lockState.status === 'other' ? lockState.who : null

  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { height: windowHeight } = useWindowDimensions()
  // Approx offset: header (~56) + title (~50) + meta row (~32) + content padding (~62)
  const editorMinHeight = windowHeight - 300

  const [shareOpen, setShareOpen] = useState(false)
  const [webViewHeight, setWebViewHeight] = useState(editorMinHeight)

  const editorRef = useRef<MarkdownEditorHandle>(null)
  const titleRef = useRef<TextInput>(null)

  // Filter self out of the avatar row — the user's own header avatar already represents
  // them, and the spec says never to surface your own join/edit as a notification.
  const avatarUsers = presenceUsers
    .filter((u) => u.id !== profile?.id)
    .map((u) => ({
      id: u.id,
      initial: (u.displayName ?? '?').charAt(0).toUpperCase(),
      color: u.color,
      editing: u.editing,
    }))

  // Auto-ignore an unanswered request after 20s (spec §8.5) — clears the banner
  // WITHOUT notifying the requester (they stay waiting rather than seeing a decline).
  useEffect(() => {
    if (!pendingRequest) return
    const t = setTimeout(() => ignoreRequest(), 20_000)
    return () => clearTimeout(t)
  }, [pendingRequest, ignoreRequest])

  // "Access changed — view only" — fires when a live share event downgrades my
  // permission mid-session (edit → view). The initial load goes view → edit/owner,
  // so only the edit→view direction is a genuine downgrade; upgrades speak for
  // themselves through the pill flipping to "Tap to edit".
  const prevPermissionRef = useRef(permission)
  const [accessNotice, setAccessNotice] = useState<string | null>(null)
  useEffect(() => {
    const prev = prevPermissionRef.current
    prevPermissionRef.current = permission
    if (prev === 'edit' && permission === 'view' && !accessRevoked) {
      setAccessNotice('Access changed — view only')
      const t = setTimeout(() => setAccessNotice(null), 4000)
      return () => clearTimeout(t)
    }
  }, [permission, accessRevoked])

  // "X is now editing" info bar — only fires on a genuine state transition so that
  // opening a note where someone is already editing doesn't show a stale notice.
  // Tracks both status and who, so a handover (A → B while status stays 'other') also fires.
  const prevLockRef = useRef<{ status: string; who: string | null }>({
    status: 'free',
    who: null,
  })
  const [editingNotice, setEditingNotice] = useState<string | null>(null)
  useEffect(() => {
    const prev = prevLockRef.current
    prevLockRef.current = { status: lockState.status, who: lockedBy }

    if (lockState.status === 'other' && lockedBy) {
      const isNewEditor = prev.status !== 'other' || prev.who !== lockedBy
      if (isNewEditor) {
        setEditingNotice(`${lockedBy} is now editing`)
        const t = setTimeout(() => setEditingNotice(null), 3000)
        return () => clearTimeout(t)
      }
    } else {
      setEditingNotice(null)
    }
  }, [lockState.status, lockedBy])

  async function handleBack() {
    // Discard abandoned blank notes so empty "+" taps don't litter the workspace.
    await discardIfEmpty()
    router.back()
  }

  function handleContentTap() {
    if (isViewer) return // read-only share — no pen to acquire, no edit request
    if (lockState.status === 'free') {
      acquire()
    } else if (lockState.status === 'other') {
      requestEdit()
    }
  }

  function handleDoneEditing() {
    release()
    titleRef.current?.blur()
  }

  function handleHandOver() {
    acceptRequest()
  }

  function handleKeep() {
    declineRequest()
  }

  function handleToolbarAction(action: ToolbarAction) {
    editorRef.current?.execCommand(action)
  }

  // Save-status indicator — calm by design (APP_AESTHETIC §8: the content IS the
  // feedback). Normal autosaves complete in well under a second, so the dot stays a
  // steady green "Saved"; "Saving…" only surfaces when a save is genuinely stuck
  // (>1.5s — slow network), and errors always show immediately.
  const [showSaving, setShowSaving] = useState(false)
  useEffect(() => {
    if (saveStatus !== 'saving') {
      setShowSaving(false)
      return
    }
    const t = setTimeout(() => setShowSaving(true), 1500)
    return () => clearTimeout(t)
  }, [saveStatus])

  const saveColor =
    saveStatus === 'error' ? colors.danger      // destructive — system red (APP_AESTHETIC §2)
      : showSaving ? colors.icon                // in progress (prolonged only)
        : colors.presence                       // saved — live status colour
  const saveLabel =
    saveStatus === 'error' ? "Couldn't save"
      : showSaving ? 'Saving…'
        : 'Saved'

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.icon} />
        </View>
      </ScreenContainer>
    )
  }

  if (error || !file) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.65} style={styles.backButton}>
            <ChevronLeft size={20} color={colors.ink} strokeWidth={1.5} />
            <Text variant="body" className="ml-0.5">Notes</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text variant="body" className="text-ink-muted">Note not found.</Text>
        </View>
      </ScreenContainer>
    )
  }

  // Access revoked mid-session — the hook already tore the channel down (the live
  // mirror must stop streaming to a revoked user). Downgrade-in-place per the
  // product decision: calm empty state (APP_AESTHETIC §9), only the back action.
  // router.back() directly — no discardIfEmpty (never delete a note we don't own).
  if (accessRevoked) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.65} style={styles.backButton}>
            <ChevronLeft size={20} color={colors.ink} strokeWidth={1.5} />
            <Text variant="body" className="ml-0.5">Notes</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text variant="body" className="text-ink-muted">Access removed.</Text>
          <Text variant="caption" className="text-empty-faint mt-1.5">
            This note is no longer shared with you.
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ───────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.65}
            style={styles.backButton}
          >
            <ChevronLeft size={20} color={colors.ink} strokeWidth={1.5} />
            <Text variant="body" className="ml-0.5">Notes</Text>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            {/* Presence is ambient — show other collaborators in every mode. */}
            {avatarUsers.length > 0 && (
              <PresenceAvatars users={avatarUsers} maxVisible={3} />
            )}
            {/* Share — always visible to the owner regardless of edit state.
                Editing a note shouldn't hide the ability to share it. */}
            {isOwner && (
              <TouchableOpacity
                onPress={() => setShareOpen(true)}
                activeOpacity={0.65}
                style={styles.iconButton}
              >
                <Share2 size={20} color={colors.ink} strokeWidth={1.5} />
              </TouchableOpacity>
            )}
            {/* Done — only while holding the pen; tapping releases it. */}
            {canEdit && (
              <TouchableOpacity
                onPress={handleDoneEditing}
                activeOpacity={0.65}
                style={styles.iconButton}
              >
                <Check size={20} color={colors.ink} strokeWidth={1.5} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Divider />

        {/* ── Content area — notices FLOAT over it (no reflow). The writing surface
             never jumps because a banner appeared (APP_AESTHETIC: meditative, unhurried). */}
        <View style={styles.contentArea}>
          <NoteNotices
            offline={isOffline}
            notices={[
              accessNotice,
              !canEdit && requestState !== 'idle'
                ? requestState === 'declined'
                  ? 'Request declined'
                  : requestState === 'timeout'
                    ? 'No response — try again later'
                    : 'Request sent — waiting for the writer to finish'
                : null,
              !canEdit && requestState === 'idle' ? editingNotice : null,
            ].filter((n): n is string => !!n)}
            requestFrom={canEdit && pendingRequest ? pendingRequest.displayName : null}
            onHandOver={handleHandOver}
            onKeep={handleKeep}
          />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title — always a TextInput to avoid remount flash; editable prop controls access.
               For editors without the pen, an invisible overlay captures the tap-to-acquire.
               Viewers get NO overlay — the title stays selectable/copyable for them (they
               have no pen action anyway). */}
          <View>
            <TextInput
              ref={titleRef}
              value={title}
              onChangeText={setTitle}
              placeholder="Note title"
              placeholderTextColor={colors.placeholder}
              style={styles.titleInput}
              selectionColor={colors.ink}
              returnKeyType="next"
              submitBehavior="submit"
              editable={canEdit}
            />
            {!canEdit && canEditPermission && (
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={handleContentTap}
                activeOpacity={1}
              />
            )}
          </View>

          {/* Save status — only relevant when you can write; hide for view-only users */}
          {!isViewer && (
            <View style={styles.metaRow}>
              <View style={[styles.savedDot, { backgroundColor: saveColor }]} />
              <Text variant="caption" className="text-icon">{saveLabel}</Text>
            </View>
          )}

          {/* Editor — TipTap on both platforms */}
          {Platform.OS === 'web' && MarkdownEditorWeb ? (
            <MarkdownEditorWeb
              ref={editorRef}
              content={content}
              onChange={setContent}
              editable={canEdit}
              onEditRequest={handleContentTap}
              style={styles.editorSurface}
            />
          ) : MarkdownEditorNative ? (
            <MarkdownEditorNative
              ref={editorRef}
              content={content}
              onChange={setContent}
              editable={canEdit}
              onEditRequest={handleContentTap}
              onHeightChange={setWebViewHeight}
              style={{ height: Math.max(webViewHeight, editorMinHeight), minHeight: editorMinHeight }}
            />
          ) : null}

          <View style={{ height: 120 }} />
        </ScrollView>
        </View>

        {/* ── Toolbar (only when I hold the pen) ────────── */}
        {canEdit && (
          <MarkdownToolbar onAction={handleToolbarAction} />
        )}

        {/* ── Bottom presence pill (view / locked modes) ── */}
        {!canEdit && (
          <TouchableOpacity
            onPress={() => {
              if (!canEditPermission) return       // read-only viewer — no action
              if (isLocked) requestEdit()           // someone holds it → ask for the pen
              else acquire()                        // pen is free → take it
            }}
            activeOpacity={canEditPermission ? 0.75 : 1}
            disabled={!canEditPermission}
            style={[styles.presencePill, { bottom: insets.bottom + 20 }]}
          >
            <View style={[styles.presenceDot, !isLocked && styles.presenceDotViewing]} />
            <Text variant="caption" className="text-ink ml-1.5">
              {isLocked
                ? holderLeft
                  ? `${lockedBy} left — freeing the pen…`
                  : `${lockedBy} is editing`
                : canEditPermission
                  ? 'Tap to edit'
                  : 'Viewing'}
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      {/* ── Share sheet ─────────────────────────────── */}
      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        fileName={title}
        fileId={file.id}
      />
    </ScreenContainer>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The notices' positioning context — content scrolls underneath floating banners
  // (NoteNotices positions itself absolutely within this).
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  titleInput: {
    // Page-title scale (APP_AESTHETIC §3): Space Grotesk, 30 / −0.8. Weight lives in the
    // font family (SpaceGrotesk_700Bold), so no fontWeight here.
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.8,
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  savedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.presence,  // live status colour — limited purposeful colour per APP_AESTHETIC §2
  },
  editorSurface: {
    minHeight: 300,
  },
  presencePill: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    // Whisper shadow per §6 (note-list values) — the canvas/surface contrast does the
    // separating, not the shadow.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  presenceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.presence,  // live presence indicator — same exception as avatar colours (APP_AESTHETIC §2)
  },
  presenceDotViewing: {
    backgroundColor: colors.icon,  // passive viewing state
  },
})
