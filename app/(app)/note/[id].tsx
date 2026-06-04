import type { MarkdownEditorHandle } from '@/components/MarkdownEditorWeb'
import { MarkdownToolbar, type ToolbarAction } from '@/components/MarkdownToolbar'
import { PresenceAvatars } from '@/components/PresenceAvatars'
import { ShareSheet } from '@/components/ShareSheet'
import { Divider } from '@/components/ui/Divider'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { Text } from '@/components/ui/Text'
import { COLLABORATOR, COLLABORATOR_2, getFileById, getFolderById, OWNER } from '@/lib/dummyData'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Check, ChevronLeft, Share2 } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
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

// Platform-specific editor — Metro resolves .web.tsx / .native.tsx automatically
const MarkdownEditorWeb = Platform.OS === 'web'
  ? require('@/components/MarkdownEditorWeb').MarkdownEditorWeb
  : null
const MarkdownEditorNative = Platform.OS !== 'web'
  ? require('@/components/MarkdownEditorNative').MarkdownEditorNative
  : null

const PRESENCE_USERS = [
  { id: OWNER.id, initial: 'T', color: '#1A1A1A' },  // ink — owner
  { id: COLLABORATOR.id, initial: 'M', color: '#6BBF94' },  // avatar identity colour (APP_AESTHETIC.md §2 exception)
  { id: COLLABORATOR_2.id, initial: 'A', color: '#9B8EC4' },  // avatar identity colour (APP_AESTHETIC.md §2 exception)
]

// ── Lock state ──────────────────────────────────────────────────────────────
// 'free'  → nobody editing, tap content to acquire
// 'me'    → I hold the pen
// 'other' → someone else holds the pen
//
// When Supabase Presence lands, lockState comes from useFileSync() instead.
// The component logic below does not change at all.
type LockState =
  | { status: 'free' }
  | { status: 'me' }
  | { status: 'other'; who: string }

export default function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const file = id !== 'new' ? getFileById(id) : undefined
  const folder = file?.folder_id ? getFolderById(file.folder_id) : undefined

  // To demo the locked state, change { status: 'free' } → { status: 'other', who: 'Maya' }
  const [lockState, setLockState] = useState<LockState>({ status: 'free' }) //{ status: 'other', who: 'Maya' })
  const [pendingEditRequest, setPending] = useState<{ who: string } | null>(null)
  const [requestSentFeedback, setRequestSent] = useState(false)

  const canEdit = lockState.status === 'me'
  const isLocked = lockState.status === 'other'
  const lockedBy = lockState.status === 'other' ? lockState.who : null

  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  // Approx offset: header (~56) + title (~50) + meta row (~32) + content padding (~62)
  const editorMinHeight = windowHeight - 300

  const [title, setTitle] = useState(file?.title ?? '')
  const [content, setContent] = useState(file?.content ?? '')
  const [shareOpen, setShareOpen] = useState(false)
  const [webViewHeight, setWebViewHeight] = useState(editorMinHeight)

  const editorRef = useRef<MarkdownEditorHandle>(null)
  const titleRef = useRef<TextInput>(null)

  // Auto-dismiss edit-request toast after 8 s
  useEffect(() => {
    if (!pendingEditRequest) return
    const t = setTimeout(() => setPending(null), 8000)
    return () => clearTimeout(t)
  }, [pendingEditRequest])

  function handleContentTap() {
    if (lockState.status === 'free') {
      // Acquire the pen
      // Real impl: await useFileSync.acquireLock()
      setLockState({ status: 'me' })
    } else if (lockState.status === 'other') {
      // Request the pen from the current writer
      // Real impl: useFileSync.requestLock() → Supabase Broadcast
      // Demo: simulate both sides in one session
      setRequestSent(true)
      setTimeout(() => setRequestSent(false), 3000)
      setPending({ who: 'Another viewer' })
    }
  }

  function handleDoneEditing() {
    // Real impl: await useFileSync.releaseLock()
    setLockState({ status: 'free' })
    titleRef.current?.blur()
    setPending(null)
  }

  function handleHandOver() {
    setLockState({ status: 'free' })
    setPending(null)
  }

  function handleDismissRequest() {
    setPending(null)
  }

  function handleToolbarAction(action: ToolbarAction) {
    editorRef.current?.execCommand(action)
  }

  const backLabel = folder?.name ?? 'Notes'
  const savedMeta = folder ? `Saved just now · ${folder.name}` : 'Saved just now'

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
            onPress={() => router.back()}
            activeOpacity={0.65}
            style={styles.backButton}
          >
            <ChevronLeft size={20} color="#1A1A1A" strokeWidth={1.5} />
            <Text variant="body" className="ml-0.5">{backLabel}</Text>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            {canEdit ? (
              // Done button — releases the pen
              <TouchableOpacity
                onPress={handleDoneEditing}
                activeOpacity={0.65}
                style={styles.iconButton}
              >
                <Check size={20} color="#1A1A1A" strokeWidth={1.5} />
              </TouchableOpacity>
            ) : (
              // View / locked mode — show presence + share
              <>
                <PresenceAvatars users={PRESENCE_USERS} maxVisible={2} />
                <TouchableOpacity
                  onPress={() => setShareOpen(true)}
                  activeOpacity={0.65}
                  style={styles.iconButton}
                >
                  <Share2 size={20} color="#1A1A1A" strokeWidth={1.5} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <Divider />

        {/* ── Edit-request banner (writer sees this) ───── */}
        {canEdit && pendingEditRequest && (
          <View style={styles.editRequestBanner}>
            <Text variant="caption" className="text-ink" style={{ flex: 1 }}>
              {pendingEditRequest.who} wants to edit
            </Text>
            <TouchableOpacity onPress={handleDismissRequest} style={styles.bannerAction}>
              <Text variant="caption" className="text-ink-muted">Keep</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleHandOver} style={styles.bannerAction}>
              <Text variant="caption" className="text-ink font-semibold">Hand over</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── "Request sent" feedback (viewer sees this) ── */}
        {!canEdit && requestSentFeedback && (
          <View style={styles.editRequestBanner}>
            <Text variant="caption" className="text-ink-muted" style={{ flex: 1, textAlign: 'center' }}>
              Request sent — waiting for the writer to finish
            </Text>
          </View>
        )}

        {/* ── Content ─────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title — always a TextInput to avoid remount flash; editable prop controls access */}
          <TextInput
            ref={titleRef}
            value={title}
            onChangeText={setTitle}
            placeholder="Note title"
            placeholderTextColor="#B4B6BB"
            style={styles.titleInput}
            selectionColor="#1A1A1A"
            returnKeyType="next"
            blurOnSubmit={false}
            editable={canEdit}
          />

          {/* Save status */}
          <View style={styles.metaRow}>
            <View style={styles.savedDot} />
            <Text variant="caption" className="text-icon">{savedMeta}</Text>
          </View>

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

        {/* ── Toolbar (only when I hold the pen) ────────── */}
        {canEdit && (
          <MarkdownToolbar onAction={handleToolbarAction} />
        )}

        {/* ── Bottom presence pill (view / locked modes) ── */}
        {!canEdit && (
          <TouchableOpacity
            onPress={() => {
              // Demo shortcut: tap pill to release lock
              if (isLocked) setLockState({ status: 'free' })
            }}
            activeOpacity={isLocked ? 0.75 : 1}
            disabled={!isLocked}
            style={[styles.presencePill, { bottom: insets.bottom + 20 }]}
          >
            <View style={[styles.presenceDot, !isLocked && styles.presenceDotViewing]} />
            <Text variant="caption" className="text-ink ml-1.5">
              {isLocked ? `${lockedBy} is editing` : '2 viewing'}
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      {/* ── Share sheet ─────────────────────────────── */}
      {file && (
        <ShareSheet
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          fileName={title}
          fileId={file.id}
          publicSlug={file.public_slug}
        />
      )}
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
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
  editRequestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',  // surface token
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E6',  // divider token
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  bannerAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',  // ink token
    letterSpacing: -0.6,
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
    backgroundColor: '#6BBF94',  // live status colour — limited purposeful colour per APP_AESTHETIC.md §2
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
    backgroundColor: '#FFFFFF',  // surface token
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8E8E6',  // divider token
  },
  presenceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6BBF94',  // live presence indicator — same exception as avatar colours (APP_AESTHETIC.md §2)
  },
  presenceDotViewing: {
    backgroundColor: '#ADADAB',  // icon token — passive viewing state
  },
})
