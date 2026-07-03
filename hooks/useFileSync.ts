import { useProfileContext } from '@/context/ProfileContext'
import { subscribeAppBackground, subscribeReconnect } from '@/lib/connectivity'
import { useSupabase } from '@/lib/supabase'
import { avatarColorFor } from '@/theme/avatarColors'
import type { File, Pen } from '@/types/db'
import { useUser } from '@clerk/expo'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePen } from './usePen'

export type { LockState } from './usePen'
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type FilePermission = 'owner' | 'edit' | 'view'

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
type RawPresence = { id: string; displayName: string; color: string }

const AUTOSAVE_DEBOUNCE_MS = 700
const BROADCAST_THROTTLE_MS = 200
const DECLINE_FEEDBACK_MS = 2500
// How long a requester waits for a response before auto-abandoning the request.
const REQUEST_TIMEOUT_MS = 20_000

/** True when the HTML carries no visible text (e.g. '' or '<p></p>'). */
function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0
}

/**
 * Owns a single open note: load + debounced autosave + discard-if-empty, PLUS the
 * turn-based live-editing engine. This is the ONE place note content is read from /
 * written to Supabase and the ONE place the note's realtime channel lives
 * (AGENTS.md principle #1).
 *
 * The pen (who may write) is a DB row — see hooks/usePen.ts and 0009_pens.sql.
 * Each realtime primitive does exactly one job:
 *   pens row (postgres_changes) → who holds the pen
 *   Presence                    → who is viewing (avatars only)
 *   Broadcast                   → keystroke mirror + edit-request/decline pings
 *
 * A future Yjs CRDT upgrade swaps only this hook's internals — no schema
 * migration (`yjs_state` already exists).
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

  const [rawPresence, setRawPresence] = useState<RawPresence[]>([])
  const [pendingRequest, setPendingRequest] = useState<EditRequest | null>(null)
  const [requestState, setRequestState] = useState<RequestState>('idle')
  // The pen-holder's presence dropped but their lease hasn't expired yet —
  // drives the "X left — freeing the pen…" pill microstate.
  const [holderLeft, setHolderLeft] = useState(false)
  const [isLive, setIsLive] = useState(false)
  // True when the realtime channel has dropped and is attempting to reconnect.
  const [isOffline, setIsOffline] = useState(false)
  // Access was revoked mid-session (share row deleted). Flipping this tears the
  // channel down (the broadcast mirror has no RLS — a revoked viewer must stop
  // receiving live keystrokes) and the note screen swaps to "Access removed".
  const [accessRevoked, setAccessRevoked] = useState(false)
  // Bumped to force a full channel teardown + rebuild (dead-socket recovery after
  // backgrounding / token expiry). rebuildingRef tells the cleanup it's a rebuild,
  // not a real unmount. The pen survives either way — it lives in the DB.
  const [reconnectNonce, setReconnectNonce] = useState(0)

  // ── The pen — single source of truth for who may write ─────────────────────
  const pen = usePen(id, user?.id ?? null)
  const isMineRef = pen.isMineRef
  const holderIdRef = useRef<string | null>(null)
  holderIdRef.current = pen.holderId

  // Refs hold the latest values for the debounced save closure.
  const titleRef = useRef('')
  const contentRef = useRef('')
  const versionRef = useRef(1)
  const dirtyRef = useRef(false)
  const deletedRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs the realtime handlers read (so the channel never resubscribes on re-render).
  const channelRef = useRef<RealtimeChannel | null>(null)
  const permissionRef = useRef<FilePermission>('view')
  const pendingRequestRef = useRef<EditRequest | null>(null)
  const autoClaimedRef = useRef(false)      // one auto-claim chance per open note
  const broadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const declineTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The 20s window the requester gives the pen-holder to respond.
  const requesterTimeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // True once the FIRST subscribe for this note succeeded; every later SUBSCRIBED
  // is a rejoin and triggers a resync (missed broadcasts are gone for good).
  const hadSubscribedRef = useRef(false)
  const rebuildingRef = useRef(false)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryAttemptRef = useRef(0)
  const accessRevokedRef = useRef(false)
  // Owner id of the loaded file — lets resolvePermission() skip the share lookup
  // for owners without re-fetching the file row.
  const ownerIdRef = useRef<string | null>(null)

  // My presence identity + email for logging, kept fresh each render.
  const meRef = useRef({ userId: '', displayName: 'Someone', color: avatarColorFor(''), email: '' })
  meRef.current = {
    userId: user?.id ?? '',
    displayName: profile?.display_name ?? user?.firstName ?? 'Someone',
    color: profile?.color ?? avatarColorFor(user?.id ?? ''),
    email: profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? 'unknown',
  }

  // Scoped log helper — every line tagged with the note id + the user's email.
  const LOG = useCallback((msg: string, ...extra: unknown[]) => {
    console.log(`[FileSync note:${id}] (${meRef.current.email}) ${msg}`, ...extra)
  }, [id])

  useEffect(() => { pendingRequestRef.current = pendingRequest }, [pendingRequest])

  // Avatars: presence list + the editing dot derived from the pen row.
  const editingId = pen.lockState.status === 'free' ? null : pen.holderId
  const presenceUsers: PresenceUser[] = useMemo(
    () => rawPresence.map((u) => ({ ...u, editing: u.id === editingId })),
    [rawPresence, editingId],
  )

  // ── Autosave (version-guarded, self-recovering) ─────────────────────────────
  const save = useCallback(async (opts?: { isRetry?: boolean }): Promise<void> => {
    if (!user || deletedRef.current) return
    // Only the pen-holder writes. isMineRef is the DB-backed truth, updated
    // synchronously by every claim/release/transfer/row event — a pending
    // debounce timer that fires after the pen moved on is silently dropped.
    if (!isMineRef.current) {
      LOG('save() → skipped (not holding the pen)')
      return
    }
    if (permissionRef.current === 'view') {
      LOG('save() → skipped (view-only permission)')
      return
    }
    setSaveStatus('saving')
    const expectedVersion = versionRef.current
    const newVersion = expectedVersion + 1

    LOG(`save() → title="${titleRef.current.slice(0, 30)}" expectedVersion=${expectedVersion}`)

    // WHERE version = expectedVersion is bookkeeping insurance: with a single
    // DB-enforced writer, conflicts are structurally rare (a handover race at
    // worst), and the one retry below self-heals that case.
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
      // 0 rows updated — version conflict or RLS rejection. Fetch the DB version
      // to tell the difference and recover from conflicts with one retry.
      const { data: dbRow } = await supabase
        .from('files')
        .select('version, updated_by')
        .eq('id', id)
        .maybeSingle()
      if (dbRow && dbRow.version !== expectedVersion) {
        LOG(`save() → version conflict (ours=${expectedVersion} db=${dbRow.version}), adopting DB version`)
        versionRef.current = dbRow.version
        if (!opts?.isRetry) return save({ isRetry: true })
        LOG('save() → retry also conflicted — giving up until next edit')
      } else {
        LOG('save() → 0 rows updated (RLS rejection or note deleted)')
      }
      setSaveStatus('error')
      return
    }

    versionRef.current = newVersion
    dirtyRef.current = false
    setSaveStatus('saved')
    LOG(`save() → OK  newVersion=${newVersion}`)
  }, [supabase, user?.id, id, isMineRef, LOG])

  const scheduleSave = useCallback(() => {
    // Only the pen-holder saves — a viewer's editor echoing mirrored content
    // must never schedule a write.
    if (!isMineRef.current) return
    dirtyRef.current = true
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { save() }, AUTOSAVE_DEBOUNCE_MS)
  }, [save, isMineRef])

  /** Write any pending edit immediately. MUST be awaited by callers that
   *  broadcast or hand over afterwards — the broadcast must carry the post-save
   *  version. Call while still holding the pen (save() checks isMineRef). */
  const flushSave = useCallback(async (): Promise<void> => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    if (dirtyRef.current && !deletedRef.current) {
      LOG('flushSave() → flushing pending edit')
      await save()
    }
  }, [save, LOG])

  // ── Live broadcast mirror (writer → viewers) ────────────────────────────────

  // What the last 'content' broadcast carried — skip-if-unchanged for the throttle.
  const lastBroadcastRef = useRef<{ html: string; title: string } | null>(null)

  /** Apply mirrored content from the writer WITHOUT scheduling a save.
   *  The writer's version rides along so that if we later receive the pen,
   *  our first save uses the correct baseline. */
  const applyRemoteContent = useCallback((html: string, title?: string, version?: number) => {
    contentRef.current = html
    setContentState(html)
    if (title !== undefined && title !== titleRef.current) {
      titleRef.current = title
      setTitleState(title)
    }
    if (version !== undefined) versionRef.current = version
  }, [])

  /** Send the current content + title + version on the note channel immediately. */
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

  /** Throttled content broadcast — only while I hold the pen, only on change. */
  const scheduleBroadcast = useCallback(() => {
    if (!isMineRef.current) return
    if (broadcastTimer.current) return
    broadcastTimer.current = setTimeout(() => {
      broadcastTimer.current = null
      if (!channelRef.current || !isMineRef.current) return
      const last = lastBroadcastRef.current
      if (last && last.html === contentRef.current && last.title === titleRef.current) return
      sendContentNow()
    }, BROADCAST_THROTTLE_MS)
  }, [sendContentNow, isMineRef])

  const setTitle = useCallback((t: string) => {
    titleRef.current = t
    setTitleState(t)
    scheduleSave()
    scheduleBroadcast()   // titles mirror live exactly like content
  }, [scheduleSave, scheduleBroadcast])

  const setContent = useCallback((c: string) => {
    contentRef.current = c
    setContentState(c)
    scheduleSave()
    scheduleBroadcast()
  }, [scheduleSave, scheduleBroadcast])

  // ── Pen actions (thin wrappers over usePen — the DB decides everything) ────
  const acquire = useCallback(() => {
    if (permissionRef.current === 'view') {
      LOG('acquire() → blocked (view-only permission)')
      return
    }
    void pen.claim()
  }, [pen.claim, LOG])

  /** Drop the pen: flush the final save while still holding it, then release.
   *  The pens row event tells everyone else — no goodbye broadcasts needed. */
  const release = useCallback(async () => {
    LOG('release() → dropping pen')
    await flushSave()
    sendContentNow()   // final mirror so viewers hold the exact saved state
    await pen.release()
    setPendingRequest(null)
  }, [flushSave, sendContentNow, pen.release, LOG])

  /** Clear the requester's 20s timeout timer. Call whenever the request resolves. */
  const clearRequesterTimeout = useCallback(() => {
    if (requesterTimeoutTimer.current) {
      clearTimeout(requesterTimeoutTimer.current)
      requesterTimeoutTimer.current = null
    }
  }, [])

  /** An editor (not the holder) asks for the pen. Starts the 20s response window. */
  const requestEdit = useCallback(() => {
    if (permissionRef.current === 'view' || isMineRef.current) return
    const ch = channelRef.current
    if (!ch) return
    LOG('requestEdit() → sending edit-request')
    ch.send({
      type: 'broadcast',
      event: 'edit-request',
      payload: { userId: meRef.current.userId, displayName: meRef.current.displayName },
    })
    setRequestState('requested')
    clearRequesterTimeout()
    requesterTimeoutTimer.current = setTimeout(() => {
      requesterTimeoutTimer.current = null
      LOG('requestEdit() → timed out (no response from pen-holder)')
      setRequestState('timeout')
      if (declineTimer.current) clearTimeout(declineTimer.current)
      declineTimer.current = setTimeout(() => setRequestState('idle'), DECLINE_FEEDBACK_MS)
    }, REQUEST_TIMEOUT_MS)
  }, [clearRequesterTimeout, isMineRef, LOG])

  /** Holder grants the pen to the pending requester — one atomic DB transfer.
   *  The requester's "granted" signal IS the pens row event naming them. */
  const acceptRequest = useCallback(async () => {
    const req = pendingRequestRef.current
    if (!req || !isMineRef.current) return
    LOG(`acceptRequest() → handing pen to ${req.displayName} (${req.userId})`)
    // Flush + final mirror while still holding the pen, so the grantee starts
    // from the freshly-saved content with the post-save version.
    await flushSave()
    sendContentNow()
    await pen.transfer(req.userId, req.displayName)
    setPendingRequest(null)
  }, [flushSave, sendContentNow, pen.transfer, isMineRef, LOG])

  /** Holder keeps the pen and tells the requester their ask was declined. */
  const declineRequest = useCallback(() => {
    const req = pendingRequestRef.current
    if (channelRef.current && req) {
      LOG(`declineRequest() → declining request from ${req.displayName}`)
      channelRef.current.send({ type: 'broadcast', event: 'decline', payload: { to: req.userId } })
    }
    setPendingRequest(null)
  }, [LOG])

  /** Dismiss the request banner WITHOUT notifying the requester. */
  const ignoreRequest = useCallback(() => {
    setPendingRequest(null)
  }, [])

  // ── Pen transitions: gaining / losing ───────────────────────────────────────
  // Gaining (my claim, or a transfer to me): clear any pending request state and
  // adopt the DB baseline — the granting writer just flushed, and a light select
  // guarantees our first save can't use a stale version or revert their title.
  // Losing (transfer away, or a reap while backgrounded): drop pending writes.
  const wasMineRef = useRef(false)
  const isMine = pen.lockState.status === 'me'
  useEffect(() => {
    const was = wasMineRef.current
    wasMineRef.current = isMine
    if (isMine && !was) {
      clearRequesterTimeout()
      setRequestState('idle')
      LOG('pen → gained, adopting DB baseline')
      void (async () => {
        const { data } = await supabase.from('files').select('version, title').eq('id', id).maybeSingle()
        if (data && isMineRef.current) {
          versionRef.current = data.version
          if (data.title !== titleRef.current) {
            titleRef.current = data.title
            setTitleState(data.title)
          }
        }
      })()
    }
    if (!isMine && was) {
      LOG('pen → lost, dropping pending writes')
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
      dirtyRef.current = false
      setPendingRequest(null)
    }
  }, [isMine, supabase, id, isMineRef, clearRequesterTimeout, LOG])

  // Lock-state housekeeping: leaving 'other' clears the "holder left" hint, and
  // a pen that frees without a grant (holder released, or their lease died)
  // clears a stale "Request sent…" banner — the pill already says "Tap to edit".
  useEffect(() => {
    const status = pen.lockState.status
    if (status !== 'other') setHolderLeft(false)
    if (status === 'free') {
      clearRequesterTimeout()
      setRequestState((prev) => (prev === 'requested' ? 'idle' : prev))
    }
  }, [pen.lockState.status, clearRequesterTimeout])

  // Auto-claim on open: one chance per note, immediately after load. The DB
  // decides — if someone already holds the pen, claim_pen returns their row and
  // the UI shows "X is writing". If the pen frees later, the user taps to edit
  // (never silently handed the pen). No presence gates, no races.
  useEffect(() => {
    if (isLoading || autoClaimedRef.current) return
    autoClaimedRef.current = true
    if (permission !== 'view') {
      LOG('auto-claim → attempting (DB decides)')
      void pen.claim()
    }
  }, [isLoading, permission, pen.claim, LOG])

  // ── Permission resolution (shared by load, rejoin resync, live share events) ──
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

  /** React to a permission change discovered mid-session. Downgrade-in-place. */
  const applyPermission = useCallback(async (resolved: FilePermission | 'revoked') => {
    if (resolved === 'revoked') {
      if (accessRevokedRef.current) return
      LOG('permission → access revoked, ending live session')
      accessRevokedRef.current = true
      permissionRef.current = 'view'
      setPermission('view')
      if (isMineRef.current) void pen.release()
      setAccessRevoked(true)               // channel effect tears down → mirror stops
      return
    }
    const prev = permissionRef.current
    if (resolved === prev) return
    LOG(`permission → ${prev} → ${resolved}`)
    if (prev === 'edit' && resolved === 'view' && isMineRef.current) {
      // Downgraded mid-write: flush while the old grant may still be honoured,
      // then drop the pen — the row event tells everyone.
      await flushSave()
      await pen.release()
    }
    permissionRef.current = resolved
    setPermission(resolved)
  }, [flushSave, pen.release, isMineRef, LOG])

  /** Catch up after a socket gap: the writer re-pushes, everyone else re-pulls.
   *  The pen needs only a refetch — its truth sat safely in the DB the whole time. */
  const resyncAfterRejoin = useCallback(async () => {
    await pen.refetch()
    if (isMineRef.current) {
      await flushSave()
      sendContentNow()
    } else {
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
  }, [supabase, id, pen.refetch, isMineRef, flushSave, sendContentNow, applyRemoteContent, resolvePermission, applyPermission, LOG])

  // ── Channel lifecycle: presence + broadcast + pen watch for this note ────────
  useEffect(() => {
    // accessRevoked gate: once revoked, the channel must stay down — the broadcast
    // mirror has no RLS, so leaving it up would keep streaming live keystrokes.
    if (!user || !id || accessRevoked) return
    let cancelled = false

    LOG('channel effect → setting up channel')

    // private: realtime.messages RLS (0010) gates the channel — receiving needs
    // file visibility, sending broadcasts needs edit access. A revoked user
    // physically loses the mirror instead of us just politely tearing it down.
    const ch = supabase.channel(`note:${id}`, {
      config: { presence: { key: user.id }, private: true },
    })
    channelRef.current = ch

    // ── Presence: avatars ONLY. No editing flag, no lock derivation. ─────────
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, Array<Partial<RawPresence & { displayName: string }>>>
      const users: RawPresence[] = Object.entries(state).map(([key, metas]) => {
        // Use the LAST meta entry — Supabase accumulates metas on rapid track() calls.
        const m = metas[metas.length - 1] ?? {}
        return {
          id: key,
          displayName: (m.displayName as string | undefined) ?? 'Someone',
          color: (m.color as string | undefined) ?? avatarColorFor(key),
        }
      })
      setRawPresence(users)
    })

    ch.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const newest = newPresences[newPresences.length - 1] as Partial<RawPresence> | undefined
      // If I hold the pen, push the current content so the joiner sees the live
      // state instead of the stale DB snapshot they loaded.
      if (isMineRef.current && key !== meRef.current.userId) {
        sendContentNow(ch)
        LOG(`presence join → pushed current content to ${newest?.displayName}`)
      }
      // The holder came back before their lease ran out — cancel the "left" hint.
      if (key === holderIdRef.current) setHolderLeft(false)
    })

    ch.on('presence', { event: 'leave' }, ({ key }) => {
      LOG(`presence leave → ${key}`)
      // Remove the avatar immediately — don't wait for the next sync.
      setRawPresence((current) => current.filter((u) => u.id !== key))
      // The pen-holder vanished without releasing (crash, killed tab): shorten
      // their lease server-side. A live holder's heartbeat shrugs this off; a
      // dead one's pen frees in ~6s instead of 15.
      if (key === holderIdRef.current && key !== meRef.current.userId) {
        LOG('presence leave → holder left, nudging their lease')
        setHolderLeft(true)
        pen.nudge()
      }
    })

    // ── postgres_changes: the pen row — the ONE lock signal ──────────────────
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pens', filter: `file_id=eq.${id}` },
      (payload) => {
        if (payload.eventType === 'DELETE') pen.applyPenRow(null)
        else pen.applyPenRow(payload.new as Pen)
      },
    )

    // ── Broadcast: content mirror ─────────────────────────────────────────────
    ch.on('broadcast', { event: 'content' }, ({ payload }) => {
      if (isMineRef.current) return   // I'm the writer — don't apply my own echo
      if (payload?.html != null) {
        applyRemoteContent(
          payload.html as string,
          payload.title as string | undefined,
          payload.version as number | undefined,
        )
      }
    })

    // ── Broadcast: edit-request — only the current pen-holder reacts ─────────
    ch.on('broadcast', { event: 'edit-request' }, ({ payload }) => {
      if (!isMineRef.current) return
      if (!payload || payload.userId === meRef.current.userId) return
      LOG(`edit-request → from ${payload.displayName}`)
      setPendingRequest({ userId: payload.userId, displayName: payload.displayName })
    })

    // ── Broadcast: decline ────────────────────────────────────────────────────
    ch.on('broadcast', { event: 'decline' }, ({ payload }) => {
      if (payload?.to !== meRef.current.userId) return
      clearRequesterTimeout()
      LOG('decline → showing declined feedback')
      setRequestState('declined')
      if (declineTimer.current) clearTimeout(declineTimer.current)
      declineTimer.current = setTimeout(() => setRequestState('idle'), DECLINE_FEEDBACK_MS)
    })

    // ── postgres_changes: live permission enforcement (shares) ────────────────
    // DELETE events arrive PK-only (no resource_id readable), so any delete
    // triggers a cheap, rare re-resolve. Requires 0008_shares_realtime.sql.
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
    // (the ~60s Clerk JWT expired mid-outage). After a backoff delay, if the
    // channel still isn't joined, rebuild from scratch with fresh auth. The pen
    // is untouched throughout — heartbeats are REST.
    const scheduleChannelRetry = () => {
      if (retryTimer.current || cancelled) return
      const attempt = retryAttemptRef.current
      retryAttemptRef.current = Math.min(attempt + 1, 4)
      const delay = Math.min(2_000 * 2 ** attempt, 30_000)
      LOG(`channel retry → checking again in ${delay}ms (attempt ${attempt + 1})`)
      retryTimer.current = setTimeout(async () => {
        retryTimer.current = null
        if (cancelled) return
        if (channelRef.current?.state === 'joined') return
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

          const isRejoin = hadSubscribedRef.current
          hadSubscribedRef.current = true

          await ch.track({
            userId: meRef.current.userId,
            displayName: meRef.current.displayName,
            color: meRef.current.color,
          })

          // Rejoin: broadcasts and pen events missed during the gap are gone for
          // good — re-pull the truth (DB) and, if I'm the writer, re-push.
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
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null }

      // Rebuild teardown vs real unmount. A rebuild keeps the pen (heartbeats
      // are REST — the writer autosaves straight through the socket gap); a real
      // unmount flushes and releases it.
      const rebuilding = rebuildingRef.current
      rebuildingRef.current = false
      const wasMine = isMineRef.current

      LOG(`channel cleanup → holdingPen=${wasMine} rebuilding=${rebuilding}`)

      if (!rebuilding) {
        hadSubscribedRef.current = false
        setRawPresence([])
        setIsOffline(false)
      }
      setPendingRequest(null)
      channelRef.current = null
      setIsLive(false)

      void (async () => {
        if (wasMine && !rebuilding) {
          // Flush the final save while still holding the pen, mirror it, then
          // release. The pens row event is the instant "pen is free" signal —
          // no goodbye broadcasts needed. AWAITED so the sends actually leave
          // the socket before removeChannel closes it.
          await flushSave()
          try {
            await ch.send({
              type: 'broadcast',
              event: 'content',
              payload: { html: contentRef.current, title: titleRef.current, version: versionRef.current },
            })
          } catch {
            LOG('channel cleanup → final content broadcast failed (viewers resync from DB)')
          }
          await pen.release()
        } else if (wasMine && rebuilding) {
          // Channel is dead — just make sure pending edits hit the DB (REST).
          await flushSave()
        }
        try { await ch.untrack() } catch { /* best-effort leave signal */ }
        await supabase.removeChannel(ch)
        LOG('channel cleanup → channel removed')
      })()
    }
  }, [id, user?.id, supabase, accessRevoked, reconnectNonce, pen.applyPenRow, pen.nudge, pen.release, isMineRef, applyRemoteContent, flushSave, sendContentNow, clearRequesterTimeout, resolvePermission, applyPermission, resyncAfterRejoin, LOG])

  // ── Connectivity: foreground/online recovery + background flush ──────────────
  useEffect(() => {
    const unsubReconnect = subscribeReconnect(() => {
      // Reclaim-on-resume: if we were backgrounded past the 15s lease, our pen
      // may have expired (or been taken). Re-claim BEFORE flushing — if we lost
      // it, the mine-transition effect drops the pending writes (the new
      // holder's content is authoritative); if we kept it, flush under a fresh
      // lease so the pen-enforced RLS (0010) accepts the write.
      if (isMineRef.current) {
        void pen.claim().then((mine) => {
          if (mine) void flushSave()
          else LOG('connectivity → pen was lost while backgrounded, yielding')
        })
      }
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
      if (isMineRef.current) {
        LOG('connectivity → app backgrounded while editing, flushing save')
        void flushSave()
      }
    })
    return () => {
      unsubReconnect()
      unsubBackground()
    }
  }, [flushSave, isMineRef, pen.claim, LOG])

  // ── Load the note ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    deletedRef.current = false
    dirtyRef.current = false
    autoClaimedRef.current = false
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
          // Unread tracking: stamp shares.seen_at on first open (0007 RPC).
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
      // Only cancel the pending debounce timer — the channel cleanup owns the
      // final flush + release (single place, no double-save).
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
    }
  }, [id, supabase, user?.id, resolvePermission, LOG])

  /** Delete the note if it was never given a title or body. Returns true if discarded. */
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
    lockState: pen.lockState,
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
    isLive,
    isOffline,
    accessRevoked,
  }
}
