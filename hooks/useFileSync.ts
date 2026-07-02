import { useProfileContext } from '@/context/ProfileContext'
import { subscribeAppBackground, subscribeReconnect } from '@/lib/connectivity'
import { useSupabase } from '@/lib/supabase'
import { avatarColorFor } from '@/theme/avatarColors'
import type { File } from '@/types/db'
import { useUser } from '@clerk/expo'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type FilePermission = 'owner' | 'edit' | 'view'

/** Who holds the pen, derived from Presence. */
export type LockState =
  | { status: 'free' }
  | { status: 'me' }
  | { status: 'other'; who: string }

/** A user present in the note's channel. `editing` = currently holds the pen. */
export type PresenceUser = {
  id: string
  displayName: string
  color: string
  editing: boolean
}

/**
 * The requester's own view of an edit-request they sent.
 *   idle      — no active request
 *   requested — waiting for the pen-holder to respond
 *   declined  — pen-holder explicitly kept the pen
 *   timeout   — 20s elapsed with no response (auto-clears like 'declined')
 */
export type RequestState = 'idle' | 'requested' | 'declined' | 'timeout'

type EditRequest = { userId: string; displayName: string }

const AUTOSAVE_DEBOUNCE_MS = 700
const BROADCAST_THROTTLE_MS = 200
const DECLINE_FEEDBACK_MS = 2500
// How long a requester waits for a response before auto-abandoning the request.
const REQUEST_TIMEOUT_MS = 20_000
// How long the lock stays pinned to a handover grantee who hasn't claimed the pen yet
// (their grant handler does a DB round-trip before tracking editing=true). If they
// vanish without claiming, the pen frees itself after this grace period.
const HANDOVER_GRACE_MS = 10_000

/** True when the HTML carries no visible text (e.g. '' or '<p></p>'). */
function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0
}

/**
 * Owns a single open note: load + debounced autosave + discard-if-empty, PLUS the
 * turn-based live-editing engine (Presence soft-lock, Broadcast keystroke mirror,
 * request→accept atomic hand-over). This is the ONE place note content is read from /
 * written to Supabase and the ONE place the note's realtime channel lives
 * (AGENTS.md principle #1). A future Yjs CRDT upgrade swaps only this hook's internals
 * — no schema migration (`yjs_state` already exists). See LIVE_EDITING.md.
 */
export function useFileSync(id: string) {
  const { user } = useUser()
  const { profile } = useProfileContext()
  const supabase = useSupabase()

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitleState] = useState('')
  const [content, setContentState] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  // Least-privilege default until the file (and any share row) loads.
  const [permission, setPermission] = useState<FilePermission>('view')

  // ── Live-editing state ──────────────────────────────────────────────────────
  const [lockState, setLockState] = useState<LockState>({ status: 'free' })
  // Mirror of lockState kept in sync on every render (like meRef). Used in acquire() so
  // that the check reads the CURRENT managed state rather than ch.presenceState(), which
  // lags by a full Supabase round-trip (50–500ms) after ch.track(). That lag was causing
  // "blocked (held by another user)" right after a release/handover even though lockState
  // was already 'free' (updated instantly by the pen-released broadcast fast path).
  const lockStateRef = useRef<LockState>({ status: 'free' })
  lockStateRef.current = lockState
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
  const [pendingRequest, setPendingRequest] = useState<EditRequest | null>(null)
  const [requestState, setRequestState] = useState<RequestState>('idle')
  const [isLive, setIsLive] = useState(false)
  // True when the realtime channel has dropped and is attempting to reconnect.
  const [isOffline, setIsOffline] = useState(false)
  // Access was revoked mid-session (share row deleted). Flipping this tears the
  // channel down (the broadcast mirror has no RLS — a revoked viewer must stop
  // receiving live keystrokes) and the note screen swaps to "Access removed".
  const [accessRevoked, setAccessRevoked] = useState(false)
  // Bumped to force a full channel teardown + rebuild (dead-socket recovery after
  // backgrounding / token expiry). rebuildingRef tells the cleanup it's a rebuild,
  // not a real unmount, so pen state survives the teardown.
  const [reconnectNonce, setReconnectNonce] = useState(0)

  // Refs hold the latest values for the debounced save closure.
  const titleRef = useRef('')
  const contentRef = useRef('')
  const versionRef = useRef(1)
  const dirtyRef = useRef(false)
  const deletedRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs the realtime handlers read (so the channel never resubscribes on re-render).
  const channelRef = useRef<RealtimeChannel | null>(null)
  const editingRef = useRef(false)          // do I currently hold the pen?
  const permissionRef = useRef<FilePermission>('view')
  const pendingRequestRef = useRef<EditRequest | null>(null)
  const autoAcquiredRef = useRef(false)     // auto-acquire on open happens once
  // Set to true after the FIRST presence sync fires. Auto-acquire is gated on this so
  // we never grab the pen before presenceState() reflects who's already editing.
  // Without this guard an edit-access observer arrives, presenceState() is still empty,
  // heldByOther = false → they acquire → editingRef=true → all content broadcasts dropped.
  const hasSyncedOnce = useRef(false)
  const broadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const declineTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The 20s window the requester gives the pen-holder to respond.
  const requesterTimeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // ── Handover hold ────────────────────────────────────────────────────────────
  // While a grant is in flight (old holder untracked, grantee hasn't tracked
  // editing=true yet — their grant handler does a DB round-trip first), presence
  // shows NO editor. Without this hold the sync handler downgraded lockState to
  // 'free' in that gap, so the OLD holder's pill flipped to "Tap to edit" and they
  // could re-acquire the pen they just handed over → two simultaneous writers →
  // tiebreak yanks the pen off the grantee → version conflicts + dropped keystrokes.
  // While set, a no-editor presence sync pins lockState to 'other: grantee' instead
  // of 'free'. Cleared when the grantee shows up editing, when they leave, or after
  // HANDOVER_GRACE_MS.
  const handoverRef = useRef<{ userId: string; displayName: string } | null>(null)
  const handoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // ── Reconnect / rebuild machinery ────────────────────────────────────────────
  // True once the FIRST subscribe for this note succeeded. Every later SUBSCRIBED
  // (supabase-js auto-rejoin or a forced rebuild) is a REJOIN: presence must
  // re-assert the REAL pen state (the old code always re-tracked editing:false,
  // silently demoting the writer after every blip) and missed content must resync.
  const hadSubscribedRef = useRef(false)
  // Consumed by the first presence sync after a rejoin: if someone else is editing,
  // I yield unconditionally — my presence dropped during the gap, so the pen
  // legitimately freed and was re-taken. The lexicographic tiebreak is only for
  // simultaneous-acquire races and must not decide this case.
  const justReconnectedRef = useRef(false)
  // Set just before bumping reconnectNonce so the cleanup knows it's a rebuild:
  // skip the goodbye broadcasts (channel is dead) but KEEP editingRef — saves are
  // REST, so the writer keeps autosaving straight through the socket gap.
  const rebuildingRef = useRef(false)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryAttemptRef = useRef(0)
  const accessRevokedRef = useRef(false)
  // Owner id of the loaded file — lets resolvePermission() skip the share lookup
  // for owners without re-fetching the file row.
  const ownerIdRef = useRef<string | null>(null)

  // My presence identity + email for logging, kept fresh each render.
  // Colour fallback is a deterministic palette pick (APP_AESTHETIC §2 — avatar colours
  // come from the per-user palette only; no off-palette hex).
  const meRef = useRef({ userId: '', displayName: 'Someone', color: avatarColorFor(''), email: '' })
  meRef.current = {
    userId: user?.id ?? '',
    displayName: profile?.display_name ?? user?.firstName ?? 'Someone',
    color: profile?.color ?? avatarColorFor(user?.id ?? ''),
    email: profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? 'unknown',
  }

  // Scoped log helper — every line tagged with the note id + the user's email so you
  // can grep by either in the console. Use this everywhere inside the hook.
  const LOG = useCallback((msg: string, ...extra: unknown[]) => {
    console.log(`[FileSync note:${id}] (${meRef.current.email}) ${msg}`, ...extra)
  }, [id])

  useEffect(() => { pendingRequestRef.current = pendingRequest }, [pendingRequest])

  // ── Autosave (version-guarded, self-recovering) ─────────────────────────────
  // `force` bypasses the pen-holder guard — used ONLY by the unmount flush, which must
  // clear editingRef synchronously (so the next session can't inherit it) before the
  // async final save runs. `isRetry` bounds the conflict recovery to one attempt.
  const save = useCallback(async (opts?: { force?: boolean; isRetry?: boolean }): Promise<void> => {
    if (!user || deletedRef.current) return
    // Guard: only the current pen-holder writes to the DB. Without this, a tiebreak
    // loser's pending debounce timer fires after editingRef is cleared by the sync
    // handler, bumps the DB version, and causes a version conflict for the actual winner —
    // which then cascades to every subsequent writer via stale version broadcasts.
    if (!editingRef.current && !opts?.force) {
      LOG('save() → skipped (no longer holding the pen)')
      return
    }
    // Viewers have no write permission — bail immediately rather than letting the
    // version-guarded UPDATE hit RLS and come back as "Couldn't save".
    if (permissionRef.current === 'view') {
      LOG('save() → skipped (view-only permission)')
      return
    }
    setSaveStatus('saving')
    const expectedVersion = versionRef.current
    const newVersion = expectedVersion + 1

    LOG(`save() → title="${titleRef.current.slice(0, 30)}" expectedVersion=${expectedVersion}`)

    // WHERE version = expectedVersion guards against writing stale content if another
    // client managed to save since our last sync (e.g. in the handover gap).
    // maybeSingle() returns null data (not an error) when 0 rows match — could be a
    // version conflict OR a silent RLS rejection (both look identical here).
    const { data: saved, error: updateError } = await supabase
      .from('files')
      .update({
        title: titleRef.current,
        content: contentRef.current,
        version: newVersion,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('version', expectedVersion)
      .select('id')
      .maybeSingle()

    if (updateError) {
      console.error(`[FileSync note:${id}] (${meRef.current.email}) save() → DB error:`, updateError)
      setSaveStatus('error')
      return
    }

    if (!saved) {
      // 0 rows updated — either a version conflict or an RLS rejection.
      // Fetch the actual version sitting in the DB so we can tell the difference,
      // and RECOVER from version conflicts instead of dead-ending on 'error'.
      const { data: dbRow, error: fetchErr } = await supabase
        .from('files')
        .select('version, updated_by')
        .eq('id', id)
        .maybeSingle()

      if (fetchErr) {
        console.error(`[FileSync note:${id}] (${meRef.current.email}) save() → diagnostic fetch failed:`, fetchErr)
        LOG('save() → 0 rows updated (likely RLS rejection — JWT may be stale or user lacks permission)')
      } else if (dbRow) {
        if (dbRow.version !== expectedVersion) {
          // Version conflict — someone saved since our last sync. As the pen-holder our
          // local content is authoritative, so adopt the DB version as the new baseline
          // and retry once. Without this, one transient conflict (e.g. a handover race)
          // left the writer on a permanent "Couldn't save" until they reopened the note.
          LOG(
            `save() → version conflict | our_version=${expectedVersion} db_version=${dbRow.version}` +
            ` last_updated_by=${dbRow.updated_by} | adopting DB version`,
          )
          versionRef.current = dbRow.version
          if (!opts?.isRetry) {
            LOG('save() → retrying once with refreshed version')
            return save({ ...opts, isRetry: true })
          }
          LOG('save() → retry also conflicted — giving up until next edit')
        } else {
          LOG(
            `save() → 0 rows updated | our_version=${expectedVersion} db_version=${dbRow.version}` +
            ' → RLS blocked the write (version matched but row not updated)',
          )
        }
      } else {
        LOG('save() → 0 rows updated AND note not found in DB — was it deleted?')
      }

      setSaveStatus('error')
      return
    }

    versionRef.current = newVersion
    dirtyRef.current = false
    setSaveStatus('saved')
    LOG(`save() → OK  newVersion=${newVersion}`)
  }, [supabase, user?.id, id, LOG])

  const scheduleSave = useCallback(() => {
    // Only the pen-holder saves. Without this guard, applyRemoteContent → setContentState
    // → editor re-render → TipTap onUpdate → onChange → scheduleSave fires on the observer,
    // pushing the DB version ahead of the writer's versionRef → version conflict on every save.
    if (!editingRef.current) return
    dirtyRef.current = true
    // No setSaveStatus('saving') here — flipping the status dot on every keystroke made it
    // strobe while typing (APP_AESTHETIC §8: the content is the feedback). save() sets it.
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { save() }, AUTOSAVE_DEBOUNCE_MS)
  }, [save])

  /** Write any pending edit immediately (used before a hand-over / on release).
   *  MUST be awaited by callers that broadcast the version afterwards — otherwise the
   *  broadcast carries the pre-increment version and the next writer's first save
   *  hits a version conflict. `force` is for the unmount flush (see save()). */
  const flushSave = useCallback(async (opts?: { force?: boolean }): Promise<void> => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    if (dirtyRef.current && !deletedRef.current) {
      LOG('flushSave() → flushing pending edit')
      await save(opts)
    }
  }, [save, LOG])

  // ── Live broadcast mirror (writer → viewers) ────────────────────────────────

  // What the last 'content' broadcast carried. The throttle timer compares against this
  // and skips the send when nothing changed — without it the full document went out
  // every 200ms for the whole typing session, the dominant realtime bandwidth cost.
  const lastBroadcastRef = useRef<{ html: string; title: string } | null>(null)

  /** Apply mirrored content from the writer WITHOUT scheduling a save (viewers never write).
   *  Title rides along with content: without it, viewers showed a stale title all session
   *  and a handed-over pen could REVERT the previous writer's rename on its first save.
   *  When the writer includes their current saved version, we update versionRef so that
   *  if we later receive the pen, our first save uses the correct baseline version. */
  const applyRemoteContent = useCallback((html: string, title?: string, version?: number) => {
    contentRef.current = html
    setContentState(html)
    if (title !== undefined && title !== titleRef.current) {
      titleRef.current = title
      setTitleState(title)
    }
    if (version !== undefined) {
      LOG(`applyRemoteContent() → version synced to ${version}`)
      versionRef.current = version
    }
  }, [LOG])

  /** Send the current content + title + version on the note channel immediately.
   *  The ONE place the 'content' payload is built — release/handover/join/throttle all
   *  go through here so the payload shape and lastBroadcastRef stay consistent. */
  const sendContentNow = useCallback((channel?: RealtimeChannel) => {
    const ch = channel ?? channelRef.current
    if (!ch) return
    lastBroadcastRef.current = { html: contentRef.current, title: titleRef.current }
    ch.send({
      type: 'broadcast',
      event: 'content',
      payload: { html: contentRef.current, title: titleRef.current, version: versionRef.current },
    })
  }, [])

  /** Throttled content broadcast — only fires while I hold the pen, and only when the
   *  document or title actually changed since the last send (skip-if-unchanged). */
  const scheduleBroadcast = useCallback(() => {
    if (!editingRef.current) return
    if (broadcastTimer.current) return
    broadcastTimer.current = setTimeout(() => {
      broadcastTimer.current = null
      if (!channelRef.current || !editingRef.current) return
      const last = lastBroadcastRef.current
      if (last && last.html === contentRef.current && last.title === titleRef.current) return
      sendContentNow()
    }, BROADCAST_THROTTLE_MS)
  }, [sendContentNow])

  const setTitle = useCallback((t: string) => {
    titleRef.current = t
    setTitleState(t)
    scheduleSave()
    scheduleBroadcast()   // titles mirror live exactly like content (A1)
  }, [scheduleSave, scheduleBroadcast])

  const setContent = useCallback((c: string) => {
    contentRef.current = c
    setContentState(c)
    scheduleSave()
    scheduleBroadcast()
  }, [scheduleSave, scheduleBroadcast])

  // ── Presence soft-lock + hand-over actions ──────────────────────────────────
  const upsertMyPresence = useCallback((editing: boolean) => {
    const me = meRef.current
    if (!me.userId) return
    setPresenceUsers((current) => {
      const mine: PresenceUser = {
        id: me.userId,
        displayName: me.displayName,
        color: me.color,
        editing,
      }
      return [mine, ...current.filter((u) => u.id !== me.userId)]
    })
  }, [])

  const applyLocalEditingState = useCallback((editing: boolean) => {
    editingRef.current = editing
    upsertMyPresence(editing)
    setLockState(editing ? { status: 'me' } : { status: 'free' })
  }, [upsertMyPresence])

  const trackPresence = useCallback((editing: boolean) => {
    const ch = channelRef.current
    if (!ch) return
    const me = meRef.current
    LOG(`trackPresence(editing=${editing})`)
    ch.track({ userId: me.userId, displayName: me.displayName, color: me.color, editing })
  }, [LOG])

  /** Claim the pen — only if I can edit and nobody else currently holds it. */
  const acquire = useCallback(() => {
    if (permissionRef.current === 'view') {
      LOG('acquire() → blocked (view-only permission)')
      return
    }
    const ch = channelRef.current
    if (!ch) {
      LOG('acquire() → blocked (no channel)')
      return
    }
    // lockStateRef is kept in sync on every render and includes the fast-path
    // pen-released broadcast. ch.presenceState() lags by a full Supabase sync
    // round-trip after ch.track() and was causing spurious "blocked" errors
    // right after a release or handover. Simultaneous-acquire races are handled
    // by the presence.sync tiebreak that already exists in the hook.
    if (lockStateRef.current.status === 'other') {
      LOG(`acquire() → blocked (held by another user per lockState: ${JSON.stringify(lockStateRef.current)})`)
      return
    }
    LOG('acquire() → taking pen')
    applyLocalEditingState(true)
    trackPresence(true)
  }, [applyLocalEditingState, trackPresence, LOG])

  /**
   * Drop the pen — flush the final save, broadcast a `pen-released` signal so viewers
   * update their UI instantly (Presence propagation can lag several seconds), then
   * update local state and track the new presence state.
   */
  const release = useCallback(async () => {
    LOG('release() → dropping pen')
    // AWAITED flush BEFORE applyLocalEditingState: save() checks editingRef.current, so
    // the final flush must happen while we still hold the pen — and it must complete
    // before the content broadcast below so the broadcast carries the post-save version.
    await flushSave()
    applyLocalEditingState(false)
    const ch = channelRef.current
    if (ch) {
      // Final content sync so the incoming writer starts from a clean baseline.
      sendContentNow(ch)
      // Instant "pen is free" signal — doesn't wait for Presence GC (which can be slow).
      ch.send({
        type: 'broadcast',
        event: 'pen-released',
        payload: { userId: meRef.current.userId, displayName: meRef.current.displayName },
      })
    }
    trackPresence(false)
    setPendingRequest(null)
  }, [applyLocalEditingState, flushSave, sendContentNow, trackPresence, LOG])

  /** Drop the handover hold (grantee claimed the pen, left, or the hold expired). */
  const clearHandoverHold = useCallback(() => {
    handoverRef.current = null
    if (handoverTimer.current) { clearTimeout(handoverTimer.current); handoverTimer.current = null }
  }, [])

  /** Pin the lock to a handover grantee until they claim the pen (or the grace expires). */
  const beginHandoverHold = useCallback((userId: string, displayName: string) => {
    clearHandoverHold()
    handoverRef.current = { userId, displayName }
    handoverTimer.current = setTimeout(() => {
      handoverTimer.current = null
      if (!handoverRef.current) return
      LOG(`handover hold → expired (${handoverRef.current.displayName} never claimed the pen)`)
      handoverRef.current = null
      // The hold is gone but no presence sync will fire on its own to re-derive the
      // lock — read presenceState() directly (authoritative at this distance) and
      // free the pen if nobody is actually editing.
      const ch = channelRef.current
      if (!ch || editingRef.current) return
      const state = ch.presenceState() as Record<string, Array<{ editing?: boolean }>>
      const someoneEditing = Object.values(state).some(
        (metas) => metas[metas.length - 1]?.editing === true,
      )
      if (!someoneEditing) setLockState({ status: 'free' })
    }, HANDOVER_GRACE_MS)
  }, [clearHandoverHold, LOG])

  /** Clear the requester's 20s timeout timer. Call whenever the request resolves. */
  const clearRequesterTimeout = useCallback(() => {
    if (requesterTimeoutTimer.current) {
      clearTimeout(requesterTimeoutTimer.current)
      requesterTimeoutTimer.current = null
    }
  }, [])

  /** An editor (not the holder) asks for the pen. Starts the 20s response window. */
  const requestEdit = useCallback(() => {
    if (permissionRef.current === 'view') {
      LOG('requestEdit() → blocked (view-only permission)')
      return
    }
    if (editingRef.current) {
      LOG('requestEdit() → blocked (already hold the pen)')
      return
    }
    const ch = channelRef.current
    if (!ch) {
      LOG('requestEdit() → blocked (no channel)')
      return
    }
    LOG(`requestEdit() → sending edit-request to channel note:${id}`)
    ch.send({
      type: 'broadcast',
      event: 'edit-request',
      payload: { userId: meRef.current.userId, displayName: meRef.current.displayName },
    })
    setRequestState('requested')

    // Give the pen-holder REQUEST_TIMEOUT_MS to respond; if no reply, auto-abandon.
    clearRequesterTimeout()
    requesterTimeoutTimer.current = setTimeout(() => {
      requesterTimeoutTimer.current = null
      LOG('requestEdit() → timed out (no response from pen-holder)')
      setRequestState('timeout')
      if (declineTimer.current) clearTimeout(declineTimer.current)
      declineTimer.current = setTimeout(() => setRequestState('idle'), DECLINE_FEEDBACK_MS)
    }, REQUEST_TIMEOUT_MS)
  }, [clearRequesterTimeout, id, LOG])

  /** Holder grants the pen to the pending requester — atomic targeted hand-over. */
  const acceptRequest = useCallback(async () => {
    const ch = channelRef.current
    const req = pendingRequestRef.current
    if (!ch || !req) {
      LOG('acceptRequest() → no channel or no pending request')
      return
    }
    LOG(`acceptRequest() → handing pen to ${req.displayName} (${req.userId})`)
    // AWAIT the flush while still holding the pen. Fire-and-forget here raced the save:
    // the content broadcast and the requester's grant-side version re-fetch could both
    // read the PRE-increment version → the new holder's first save version-conflicted.
    await flushSave()
    // Pin the lock to the grantee BEFORE untracking. trackPresence(false) fires a
    // presence sync in which NOBODY is editing (the grantee hasn't claimed yet) —
    // without the hold, that sync set lockState back to 'free' and the pen could be
    // re-acquired mid-handover (including by us, the old holder).
    beginHandoverHold(req.userId, req.displayName)
    applyLocalEditingState(false)
    setLockState({ status: 'other', who: req.displayName })
    // Send the freshly-saved content + title + post-save version first so the requester
    // edits from a clean, correctly-versioned baseline, then untrack, then grant.
    // NOTE: no 'pen-released' broadcast here — during a handover the pen is promised,
    // never free; announcing "free" invited third clients into the same race.
    sendContentNow(ch)
    trackPresence(false)
    // Grant is addressed to one userId; toName lets every OTHER client pin their lock
    // to the grantee too (they handle the no-editor gap with the same hold).
    ch.send({
      type: 'broadcast',
      event: 'grant',
      payload: { to: req.userId, toName: req.displayName },
    })
    setPendingRequest(null)
  }, [applyLocalEditingState, beginHandoverHold, flushSave, sendContentNow, trackPresence, LOG])

  /** Holder keeps the pen and tells the requester their ask was declined. */
  const declineRequest = useCallback(() => {
    const ch = channelRef.current
    const req = pendingRequestRef.current
    if (ch && req) {
      LOG(`declineRequest() → declining request from ${req.displayName}`)
      ch.send({ type: 'broadcast', event: 'decline', payload: { to: req.userId } })
    }
    setPendingRequest(null)
  }, [LOG])

  /** Dismiss the request banner WITHOUT notifying the requester (the "ignore" path —
   *  the requester stays waiting rather than seeing an explicit decline). */
  const ignoreRequest = useCallback(() => {
    LOG('ignoreRequest() → silently dismissing request banner')
    setPendingRequest(null)
  }, [LOG])

  // ── Permission resolution (shared by load, rejoin resync, live share events) ──

  /** Resolve my CURRENT permission from the DB. 'view' with no share row means the
   *  file is still visible some other way (public); 'revoked' means it's gone. */
  const resolvePermission = useCallback(async (): Promise<FilePermission | 'revoked'> => {
    if (!user) return 'view'
    if (ownerIdRef.current === user.id) return 'owner'
    const { data: shareRow } = await supabase
      .from('shares')
      .select('permission')
      .eq('resource_type', 'file')
      .eq('resource_id', id)
      .eq('shared_with', user.id)
      .limit(1)
      .maybeSingle()
    if (shareRow) return shareRow.permission as 'view' | 'edit'
    // No share row — still visible (public file), or fully revoked?
    const { data: stillVisible } = await supabase
      .from('files')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    return stillVisible ? 'view' : 'revoked'
  }, [supabase, user?.id, id])

  /** React to a permission change discovered mid-session (live share events, rejoin).
   *  Downgrade-in-place per product decision 2026-06-11: no jarring navigation. */
  const applyPermission = useCallback(async (resolved: FilePermission | 'revoked') => {
    if (resolved === 'revoked') {
      if (accessRevokedRef.current) return
      LOG('permission → access revoked, ending live session')
      accessRevokedRef.current = true
      editingRef.current = false           // silence any pending debounced save now
      permissionRef.current = 'view'
      setPermission('view')
      setAccessRevoked(true)               // channel effect tears down → mirror stops
      return
    }
    const prev = permissionRef.current
    if (resolved === prev) return
    LOG(`permission → ${prev} → ${resolved}`)
    if (prev === 'edit' && resolved === 'view' && editingRef.current) {
      // Downgraded mid-write: flush while the old grant may still be honoured,
      // then drop the pen so others see it free.
      await flushSave()
      applyLocalEditingState(false)
      channelRef.current?.send({
        type: 'broadcast',
        event: 'pen-released',
        payload: { userId: meRef.current.userId, displayName: meRef.current.displayName },
      })
      trackPresence(false)
    }
    if (prev === 'view' && resolved !== 'view') {
      // Upgraded mid-session: never silently grab the pen — mark the one
      // auto-acquire chance as spent so the user chooses via the pill.
      autoAcquiredRef.current = true
    }
    permissionRef.current = resolved
    setPermission(resolved)
  }, [flushSave, applyLocalEditingState, trackPresence, LOG])

  /** Catch up after a presence/socket gap: the writer re-pushes, everyone else
   *  re-pulls. Broadcasts missed while disconnected are gone for good — without
   *  this, a viewer whose writer left mid-gap showed stale content until reopen. */
  const resyncAfterRejoin = useCallback(async () => {
    if (editingRef.current) {
      // My local content is authoritative — flush it and re-mirror to viewers.
      await flushSave()
      sendContentNow()
    } else {
      // Pull whatever saves I missed. Apply only if strictly newer than what the
      // broadcast stream already gave me (a live writer's push can race this fetch).
      const { data } = await supabase
        .from('files')
        .select('version, title, content')
        .eq('id', id)
        .maybeSingle()
      if (data && data.version > versionRef.current) {
        LOG(`resync → DB ahead (v${versionRef.current} → v${data.version}), applying`)
        applyRemoteContent(data.content, data.title, data.version)
      }
    }
    // Shares may have changed while away (revoke / downgrade / upgrade).
    await applyPermission(await resolvePermission())
  }, [supabase, id, flushSave, sendContentNow, applyRemoteContent, resolvePermission, applyPermission, LOG])

  // ── Channel lifecycle: presence + broadcast for this note ────────────────────
  useEffect(() => {
    // accessRevoked gate: once revoked, the channel must stay down — the broadcast
    // mirror has no RLS, so leaving it up would keep streaming live keystrokes to
    // someone whose access was just removed.
    if (!user || !id || accessRevoked) return
    let cancelled = false

    LOG('channel effect → setting up channel')

    const ch = supabase.channel(`note:${id}`, {
      config: { presence: { key: user.id } },
    })
    channelRef.current = ch

    // ── Presence: sync (full state snapshot) ────────────────────────────────
    ch.on('presence', { event: 'sync' }, () => {
      // Mark that we've seen at least one real presence state. The auto-acquire
      // useEffect is gated on this so it never fires against an empty presenceState().
      hasSyncedOnce.current = true
      const state = ch.presenceState() as Record<string, Array<Partial<PresenceUser>>>
      const users: PresenceUser[] = Object.entries(state).map(([key, metas]) => {
        // Use the LAST meta entry — Supabase accumulates metas on rapid track() calls;
        // the newest is always last, so reading metas[0] can show a stale editing state.
        const m = metas[metas.length - 1] ?? {}
        return {
          id: key,
          displayName: (m.displayName as string | undefined) ?? 'Someone',
          color: (m.color as string | undefined) ?? avatarColorFor(key),
          editing: m.editing === true,
        }
      })
      setPresenceUsers(users)

      const me = meRef.current.userId
      const editingIds = users.filter((u) => u.editing).map((u) => u.id)

      LOG(`presence sync → ${users.length} user(s) present, editing: [${editingIds.join(', ')}]`)

      // Someone is editing → any in-flight handover has been claimed; drop the hold.
      if (editingIds.length > 0 && handoverRef.current) {
        LOG('presence sync → handover claimed, clearing hold')
        clearHandoverHold()
      }

      // Reconnect yield: my presence dropped during a gap, so the pen legitimately
      // freed — if someone else took it while I was away, they keep it. This must
      // NOT fall through to the lexicographic tiebreak below (that rule is for
      // simultaneous-acquire races and could wrongly yank the pen off the person
      // who has been actively writing the whole time).
      if (justReconnectedRef.current) {
        justReconnectedRef.current = false
        const takenByOther = users.find((u) => u.editing && u.id !== me)
        if (takenByOther && editingRef.current) {
          LOG(`presence sync → reconnect yield: ${takenByOther.displayName} took the pen while I was away`)
          editingRef.current = false
          trackPresence(false)
          setLockState({ status: 'other', who: takenByOther.displayName })
          return
        }
      }

      // Acquire-race tiebreak: if more than one client thinks it holds the pen, the
      // client whose userId is NOT lexicographically smallest yields. Stable winner.
      if (editingIds.length > 1 && editingRef.current) {
        const winner = [...editingIds].sort()[0]
        if (me !== winner) {
          LOG(`presence sync → race tiebreak: yielding pen to ${winner}`)
          editingRef.current = false
          trackPresence(false)
          // Downgrade the UI too. The early return used to leave lockState at 'me',
          // so the loser's editor stayed editable while editingRef=false silently
          // dropped every keystroke and save until the next sync.
          const winnerUser = users.find((u) => u.id === winner)
          setLockState({ status: 'other', who: winnerUser?.displayName ?? 'Someone' })
          return
        }
      }

      if (editingIds.includes(me)) {
        setLockState({ status: 'me' })
      } else if (editingIds.length > 0) {
        const other = users.find((u) => u.editing && u.id !== me)
        setLockState({ status: 'other', who: other?.displayName ?? 'Someone' })
        LOG(`presence sync → lock held by: ${other?.displayName ?? 'Someone'}`)
      } else if (handoverRef.current) {
        // Handover in flight: the old holder untracked but the grantee hasn't tracked
        // editing=true yet. The pen is promised, not free — keep it locked to them.
        setLockState({ status: 'other', who: handoverRef.current.displayName })
        LOG(`presence sync → no editor but handover in flight → locked to ${handoverRef.current.displayName}`)
      } else {
        setLockState({ status: 'free' })
        LOG('presence sync → pen is free')
      }
    })

    // ── Presence: join / leave — extra signals for faster UI response ────────
    ch.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const newest = newPresences[newPresences.length - 1] as Partial<PresenceUser> | undefined
      LOG(`presence join → key=${key} displayName=${newest?.displayName} editing=${newest?.editing}`)
      // If I hold the pen and a new user joins, immediately push the current content
      // so they see the live state right away instead of the stale DB snapshot they loaded.
      // Without this they'd have to wait for the next typed character to trigger a broadcast.
      if (editingRef.current && key !== meRef.current.userId) {
        sendContentNow(ch)
        LOG(`presence join → pushed current content to new observer (${newest?.displayName})`)
      }
    })

    ch.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      const p = leftPresences[0] as Partial<PresenceUser> | undefined
      LOG(`presence leave → key=${key} displayName=${p?.displayName}`)
      // Remove the departed user from the avatar list immediately — don't wait for the
      // next presence.sync (which fires after Supabase GC and can lag several seconds).
      setPresenceUsers((current) => current.filter((u) => u.id !== key))
      // If the user we were holding the pen for disconnected before claiming it,
      // the handover is dead — drop the hold and free the pen.
      if (handoverRef.current?.userId === key) {
        LOG('presence leave → handover grantee left before claiming, clearing hold')
        clearHandoverHold()
        if (!editingRef.current) setLockState({ status: 'free' })
        return
      }
      // When the EDITOR's presence entry leaves (closed tab / network drop without
      // sending pen-released), clear the lock immediately rather than waiting for GC.
      // Must check the leaver was actually editing: freeing on ANY departure briefly
      // flipped the lock to 'free' when a viewer left mid-session — an acquire window.
      const leaverWasEditing = (leftPresences as Array<Partial<PresenceUser>>).some(
        (m) => m.editing === true,
      )
      if (!editingRef.current && leaverWasEditing) {
        setLockState((prev) => {
          if (prev.status === 'other') {
            LOG('presence leave → clearing stale lock (editor left without releasing)')
            return { status: 'free' }
          }
          return prev
        })
      }
    })

    // ── Broadcast: content mirror ─────────────────────────────────────────────
    ch.on('broadcast', { event: 'content' }, ({ payload }) => {
      if (editingRef.current) return   // I'm the writer — don't apply my own echo
      if (payload?.html != null) {
        applyRemoteContent(
          payload.html as string,
          payload.title as string | undefined,
          payload.version as number | undefined,
        )
      }
    })

    // ── Broadcast: pen-released — instant "lock is free" for viewers ──────────
    // Sent by the writer on release() / acceptRequest() / unmount. Faster than
    // waiting for Supabase Presence GC (which can lag several seconds).
    ch.on('broadcast', { event: 'pen-released' }, ({ payload }) => {
      const from = payload?.displayName ?? payload?.userId ?? 'unknown'
      LOG(`pen-released received from ${from}`)
      // Clear their avatar's editing dot immediately — presence sync can lag seconds.
      if (payload?.userId) {
        setPresenceUsers((current) =>
          current.map((u) => (u.id === payload.userId ? { ...u, editing: false } : u)),
        )
      }
      if (editingRef.current) {
        LOG('pen-released → ignoring (I now hold the pen)')
        return
      }
      setLockState((prev) => {
        if (prev.status === 'other') return { status: 'free' }
        return prev
      })
    })

    // ── Broadcast: edit-request ───────────────────────────────────────────────
    // Only the current pen-holder reacts.
    ch.on('broadcast', { event: 'edit-request' }, ({ payload }) => {
      LOG(
        `edit-request received → from=${payload?.displayName} (${payload?.userId})` +
        ` | editingRef=${editingRef.current} | myId=${meRef.current.userId}`,
      )
      if (!editingRef.current) {
        LOG('edit-request → ignoring (I do not hold the pen)')
        return
      }
      if (!payload || payload.userId === meRef.current.userId) {
        LOG('edit-request → ignoring (from self)')
        return
      }
      LOG(`edit-request → showing prompt for ${payload.displayName}`)
      setPendingRequest({ userId: payload.userId, displayName: payload.displayName })
    })

    // ── Broadcast: grant — targeted pen hand-over ─────────────────────────────
    ch.on('broadcast', { event: 'grant' }, async ({ payload }) => {
      LOG(`grant received → to=${payload?.to} | myId=${meRef.current.userId}`)
      if (payload?.to !== meRef.current.userId) {
        // The pen is being handed to someone else. Pin the lock to them so the
        // no-editor presence gap during the handover can't read as 'free' here either.
        const toName = (payload?.toName as string | undefined) ?? 'Someone'
        LOG(`grant → pen promised to ${toName}, pinning lock until they claim`)
        beginHandoverHold(payload?.to as string, toName)
        if (!editingRef.current) setLockState({ status: 'other', who: toName })
        return
      }
      if (cancelled) return

      clearRequesterTimeout()
      // The pen is mine now — any hold (from an earlier grant to someone else) is moot.
      clearHandoverHold()

      // Re-fetch the DB version AND title before taking the pen. The granting writer
      // flushed their save and sent a final 'content' broadcast — but in rare
      // out-of-order delivery we might have missed it. A lightweight select ensures our
      // first save uses the correct baseline version and can't revert the title (A1).
      try {
        const { data } = await supabase.from('files').select('version, title').eq('id', id).single()
        if (data && !cancelled) {
          LOG(`grant → refreshed version from DB: ${data.version}`)
          versionRef.current = data.version
          if (data.title !== titleRef.current) {
            titleRef.current = data.title
            setTitleState(data.title)
          }
        }
      } catch {
        LOG('grant → version re-fetch failed (non-fatal, using broadcast version)')
      }

      if (cancelled) return
      LOG('grant → acquiring pen')
      applyLocalEditingState(true)
      trackPresence(true)
      setRequestState('idle')
    })

    // ── Broadcast: decline ────────────────────────────────────────────────────
    ch.on('broadcast', { event: 'decline' }, ({ payload }) => {
      LOG(`decline received → to=${payload?.to} | myId=${meRef.current.userId}`)
      if (payload?.to !== meRef.current.userId) return
      clearRequesterTimeout()
      LOG('decline → showing declined feedback')
      setRequestState('declined')
      if (declineTimer.current) clearTimeout(declineTimer.current)
      declineTimer.current = setTimeout(() => setRequestState('idle'), DECLINE_FEEDBACK_MS)
    })

    // ── postgres_changes: live permission enforcement (shares) ────────────────
    // Grants/downgrades/revokes must reach an OPEN note — permission used to be
    // resolved once in load(), so a revoked viewer kept receiving the broadcast
    // mirror until they closed the note. RLS scopes INSERT/UPDATE events to rows
    // I own or receive; DELETE events arrive PK-only (no resource_id readable),
    // so any delete triggers a cheap, rare re-resolve.
    // Requires `shares` in the realtime publication — 0008_shares_realtime.sql.
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shares' },
      (payload) => {
        if (permissionRef.current === 'owner') return   // owners can't lose access
        const row = payload.new as { resource_id?: string } | null
        if (payload.eventType !== 'DELETE' && row?.resource_id !== id) return
        LOG(`shares change (${payload.eventType}) → re-resolving permission`)
        void resolvePermission().then(applyPermission)
      },
    )

    // ── Channel-death recovery ────────────────────────────────────────────────
    // supabase-js auto-rejoins after transient errors, but can wedge permanently
    // (classic case: the ~60s Clerk JWT expired mid-outage, so every rejoin fails
    // auth — this was the "stops checking live data after some time" bug). After a
    // backoff delay, if the channel still isn't joined, tear down and rebuild from
    // scratch with freshly-primed auth.
    const scheduleChannelRetry = () => {
      if (retryTimer.current || cancelled) return
      const attempt = retryAttemptRef.current
      retryAttemptRef.current = Math.min(attempt + 1, 4)
      const delay = Math.min(2_000 * 2 ** attempt, 30_000)
      LOG(`channel retry → checking again in ${delay}ms (attempt ${attempt + 1})`)
      retryTimer.current = setTimeout(async () => {
        retryTimer.current = null
        if (cancelled) return
        if (channelRef.current?.state === 'joined') {
          LOG('channel retry → auto-rejoin recovered on its own')
          return
        }
        LOG('channel retry → still down, forcing full rebuild')
        try { await supabase.realtime.setAuth() } catch { /* rebuild path retries */ }
        if (cancelled) return
        rebuildingRef.current = true
        setReconnectNonce((n) => n + 1)
      }, delay)
    }

    // ── Subscribe ─────────────────────────────────────────────────────────────
    ;(async () => {
      // Prime the realtime socket with a fresh Clerk token before subscribing,
      // so postgres_changes RLS is satisfied from the first event.
      try {
        await supabase.realtime.setAuth()
        LOG('channel → realtime auth primed')
      } catch {
        LOG('channel → realtime auth prime failed (non-fatal)')
      }

      ch.subscribe(async (status) => {
        LOG(`channel → subscribe status: ${status}`)
        if (cancelled) return

        if (status === 'SUBSCRIBED') {
          retryAttemptRef.current = 0
          if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null }
          setIsLive(true)
          setIsOffline(false)

          // First SUBSCRIBED of the session joins as a viewer (auto-acquire decides
          // later, on sync). Everything after that — supabase-js auto-rejoin of this
          // channel, or the first join of a rebuilt channel — is a REJOIN: presence
          // must re-assert the REAL pen state. The old hardcoded editing:false here
          // silently demoted the writer after every blip (their editingRef stayed
          // true while presence said nobody was editing → pen looked free → races).
          const isRejoin = hadSubscribedRef.current
          hadSubscribedRef.current = true
          if (isRejoin) justReconnectedRef.current = true

          await ch.track({
            userId: meRef.current.userId,
            displayName: meRef.current.displayName,
            color: meRef.current.color,
            editing: editingRef.current,
          })
          LOG(
            isRejoin
              ? `channel → rejoined, re-tracked presence (editing=${editingRef.current})`
              : 'channel → tracked presence (editing=false), waiting for sync to auto-acquire',
          )

          if (isRejoin) void resyncAfterRejoin()
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          // CLOSED reaches here only for channels we did NOT close ourselves —
          // the unmount path sets `cancelled` before removeChannel, returning above.
          LOG(`channel → went offline (${status})`)
          setIsOffline(true)
          scheduleChannelRetry()
        }
      })
    })()

    // NOTE: realtime auth refresh (the 50s setAuth interval) lives in lib/supabase.ts —
    // one app-wide timer for the singleton socket. Do not add a per-hook interval here.

    return () => {
      cancelled = true
      if (broadcastTimer.current) { clearTimeout(broadcastTimer.current); broadcastTimer.current = null }
      if (declineTimer.current) { clearTimeout(declineTimer.current); declineTimer.current = null }
      if (requesterTimeoutTimer.current) { clearTimeout(requesterTimeoutTimer.current); requesterTimeoutTimer.current = null }
      if (handoverTimer.current) { clearTimeout(handoverTimer.current); handoverTimer.current = null }
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null }
      handoverRef.current = null

      // Rebuild teardown vs real unmount. A rebuild (dead-socket recovery) keeps the
      // pen alive: saves are REST, so the writer keeps autosaving straight through
      // the gap, and the rebuilt channel re-tracks editing=true on its first join
      // (the rejoin path above). A real unmount clears everything so the next note
      // can never inherit a stale editingRef.
      const rebuilding = rebuildingRef.current
      rebuildingRef.current = false

      LOG(`channel cleanup → editingRef=${editingRef.current} rebuilding=${rebuilding}`)

      // Capture pen state + a payload snapshot SYNCHRONOUSLY, then reset refs/state
      // before the async teardown — so the final broadcast can't pick up stale refs.
      const wasEditing = editingRef.current
      const finalPayload = { html: contentRef.current, title: titleRef.current, version: versionRef.current }

      if (!rebuilding) {
        editingRef.current = false
        autoAcquiredRef.current = false
        hadSubscribedRef.current = false
        justReconnectedRef.current = false
        setPresenceUsers([])
        setLockState({ status: 'free' })
        setIsOffline(false)
      }
      hasSyncedOnce.current = false
      setPendingRequest(null)
      channelRef.current = null
      setIsLive(false)

      void (async () => {
        if (wasEditing && !rebuilding) {
          // force: editingRef was already cleared above, so save()'s pen-holder guard
          // must be bypassed for this one final write.
          await flushSave({ force: true })
          // Final content sync + instant pen-released signal, AWAITED so they actually
          // leave the socket before removeChannel closes it. Fire-and-forget here let the
          // sends be silently dropped → viewers fell back to multi-second Presence GC.
          // finalPayload.version may be one behind the just-flushed save in a rare race —
          // harmless: a viewer who later takes the pen self-heals via save()'s conflict retry.
          try {
            finalPayload.version = versionRef.current
            await ch.send({ type: 'broadcast', event: 'content', payload: finalPayload })
            await ch.send({
              type: 'broadcast',
              event: 'pen-released',
              payload: { userId: meRef.current.userId, displayName: meRef.current.displayName },
            })
            LOG('channel cleanup → sent pen-released broadcast before disconnect')
          } catch {
            LOG('channel cleanup → final broadcast failed (viewers will rely on Presence GC)')
          }
        } else if (wasEditing && rebuilding) {
          // Channel is dead — goodbye broadcasts would be dropped anyway. Just make
          // sure pending edits hit the DB (REST write, no socket needed).
          await flushSave()
        }
        try { await ch.untrack() } catch { /* best-effort leave signal */ }
        await supabase.removeChannel(ch)
        LOG('channel cleanup → channel removed')
      })()
    }
  }, [id, user?.id, supabase, accessRevoked, reconnectNonce, applyRemoteContent, applyLocalEditingState, flushSave, sendContentNow, trackPresence, clearRequesterTimeout, beginHandoverHold, clearHandoverHold, resolvePermission, applyPermission, resyncAfterRejoin, LOG])

  // ── Connectivity: foreground/online recovery + background flush ──────────────
  // The 50s realtime-auth interval (lib/supabase.ts) doesn't tick while the app is
  // backgrounded, so the ~60s Clerk JWT is stale on every resume and supabase-js's
  // auto-rejoin can wedge. lib/connectivity re-primes auth on foreground/online,
  // then we rebuild the channel if it didn't survive on its own.
  useEffect(() => {
    const unsubReconnect = subscribeReconnect(() => {
      const ch = channelRef.current
      if (!ch) return                       // unmounted, revoked, or mid-rebuild
      if (ch.state === 'joined' || ch.state === 'joining') return
      LOG(`connectivity → channel state '${ch.state}' after reconnect signal, forcing rebuild`)
      rebuildingRef.current = true
      setReconnectNonce((n) => n + 1)
    })
    // Last-chance flush when the app leaves the foreground: the OS may kill us
    // before resume, and the debounced save would die with the JS thread.
    const unsubBackground = subscribeAppBackground(() => {
      if (editingRef.current) {
        LOG('connectivity → app backgrounded while editing, flushing save')
        void flushSave()
      }
    })
    return () => {
      unsubReconnect()
      unsubBackground()
    }
  }, [flushSave, LOG])

  // Auto-acquire on open: once live, permission is known, AND the first presence sync has
  // fired (hasSyncedOnce), take the pen if free. The hasSyncedOnce gate is critical:
  // without it, an edit-access observer arrives before presenceState() is populated,
  // sees heldByOther=false, grabs the pen, and then drops all incoming content broadcasts
  // (editingRef=true → the broadcast handler returns early). That's why observers with
  // edit access saw a frozen note that only updated after close/reopen.
  useEffect(() => {
    if (!isLive || permission === 'view' || autoAcquiredRef.current) return
    // hasSyncedOnce is a ref — it won't trigger a re-run itself, but this effect also
    // depends on lockState.status. When the first sync fires it sets both hasSyncedOnce
    // and calls setLockState, which causes this effect to re-run with the correct state.
    if (!hasSyncedOnce.current) return
    // Mark "had our one auto-acquire chance" immediately so that if the lock later
    // becomes free (owner releases) the effect doesn't fire again — the observer
    // should see "Tap to edit" and choose explicitly, not be silently handed the pen.
    // Without this, two observers watching the same note would both auto-acquire
    // simultaneously the moment the owner releases → double-acquire race.
    autoAcquiredRef.current = true
    if (lockState.status === 'free') {
      LOG(`auto-acquire → pen is free after sync, acquiring (permission=${permission})`)
      acquire()
    } else {
      LOG(`auto-acquire → skipped (lockState=${lockState.status}, pen already held by someone else)`)
    }
  }, [isLive, permission, lockState.status, acquire, LOG])

  // ── Load the note ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    deletedRef.current = false
    dirtyRef.current = false
    // Fresh note → fresh access state (a previous note's revocation must not leak).
    accessRevokedRef.current = false
    setAccessRevoked(false)
    ownerIdRef.current = null

    async function load() {
      LOG('load() → fetching note')
      setLoading(true)
      const { data, error: loadError } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .single()

      if (cancelled) return
      if (loadError) {
        console.error(`[FileSync note:${id}] load() → error:`, loadError)
        setError(new Error(loadError.message))
        setLoading(false)
        return
      }

      // Resolve this user's permission (owner / share-row permission / 'view').
      // The row just loaded, so a 'revoked' result here can only be a freak race —
      // map it to 'view'; the live shares listener handles real mid-session revokes.
      ownerIdRef.current = data.owner_id
      let resolved: FilePermission = 'view'
      if (user) {
        const r = await resolvePermission()
        resolved = r === 'revoked' ? 'view' : r
        if (resolved !== 'owner') {
          // Unread tracking: stamp shares.seen_at on first open of a note shared with
          // me. Security-definer RPC (0007) — only touches my own share row, only
          // seen_at; a no-op when no share row exists. Fire-and-forget.
          supabase.rpc('mark_share_seen', { p_resource_id: id }).then(({ error: rpcError }) => {
            if (rpcError) LOG(`load() → mark_share_seen failed (non-fatal): ${rpcError.message}`)
          })
        }
      }
      if (cancelled) return

      LOG(`load() → done. version=${data.version} permission=${resolved}`)
      setFile(data)
      titleRef.current = data.title
      contentRef.current = data.content
      versionRef.current = data.version
      setTitleState(data.title)
      setContentState(data.content)
      permissionRef.current = resolved
      setPermission(resolved)
      setError(null)
      setSaveStatus('idle')
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
      // Only cancel the pending debounce timer — do NOT call save() here.
      // The channel effect cleanup handles the final flush (flushSave when editingRef=true).
      // Calling save() in BOTH cleanups causes a double-save: both fire with the same
      // versionRef.current before either one can increment it → version conflict → "Couldn't save".
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
    }
  }, [id, supabase, user?.id, resolvePermission, LOG])

  /** Delete the note if it was never given a title or body. Returns true if discarded.
   *  Call this when leaving the editor so abandoned "+" taps don't litter the workspace. */
  const discardIfEmpty = useCallback(async (): Promise<boolean> => {
    if (titleRef.current.trim() !== '' || !isBlankHtml(contentRef.current)) return false
    if (saveTimer.current) clearTimeout(saveTimer.current)
    deletedRef.current = true
    dirtyRef.current = false
    LOG('discardIfEmpty() → deleting blank note')
    await supabase.from('files').delete().eq('id', id)
    return true
  }, [supabase, id, LOG])

  return {
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
    isLive,
    isOffline,
    accessRevoked,
  }
}
