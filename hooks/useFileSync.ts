import { useProfileContext } from '@/context/ProfileContext'
import { useSupabase } from '@/lib/supabase'
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
// Clerk session tokens are ~60s-lived; refresh the realtime socket auth before then
// so postgres_changes RLS keeps passing during long edit sessions.
const REALTIME_AUTH_REFRESH_MS = 50_000
const DECLINE_FEEDBACK_MS = 2500
// How long a requester waits for a response before auto-abandoning the request.
const REQUEST_TIMEOUT_MS = 20_000
const FALLBACK_COLOR = '#4A87D6'

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

  // My presence identity + email for logging, kept fresh each render.
  const meRef = useRef({ userId: '', displayName: 'Someone', color: FALLBACK_COLOR, email: '' })
  meRef.current = {
    userId: user?.id ?? '',
    displayName: profile?.display_name ?? user?.firstName ?? 'Someone',
    color: profile?.color ?? FALLBACK_COLOR,
    email: profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? 'unknown',
  }

  // Scoped log helper — every line tagged with the note id + the user's email so you
  // can grep by either in the console. Use this everywhere inside the hook.
  const LOG = useCallback((msg: string, ...extra: unknown[]) => {
    console.log(`[FileSync note:${id}] (${meRef.current.email}) ${msg}`, ...extra)
  }, [id])

  useEffect(() => { pendingRequestRef.current = pendingRequest }, [pendingRequest])

  // ── Autosave (version-guarded) ───────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!user || deletedRef.current) return
    // Guard: only the current pen-holder writes to the DB. Without this, a tiebreak
    // loser's pending debounce timer fires after editingRef is cleared by the sync
    // handler, bumps the DB version, and causes a version conflict for the actual winner —
    // which then cascades to every subsequent writer via stale version broadcasts.
    if (!editingRef.current) {
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
      // Diagnostic: fetch the actual version sitting in the DB so we can tell the difference.
      const { data: dbRow, error: fetchErr } = await supabase
        .from('files')
        .select('version, updated_by')
        .eq('id', id)
        .maybeSingle()

      if (fetchErr) {
        console.error(`[FileSync note:${id}] (${meRef.current.email}) save() → diagnostic fetch failed:`, fetchErr)
        LOG('save() → 0 rows updated (likely RLS rejection — JWT may be stale or user lacks permission)')
      } else if (dbRow) {
        LOG(
          `save() → 0 rows updated | our_version=${expectedVersion} db_version=${dbRow.version} last_updated_by=${dbRow.updated_by}`,
          dbRow.version === expectedVersion
            ? '→ RLS blocked the write (version matched but row not updated)'
            : '→ Version conflict — another client saved first',
        )
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
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { save() }, AUTOSAVE_DEBOUNCE_MS)
  }, [save])

  /** Write any pending edit immediately (used before a hand-over / on release). */
  const flushSave = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    if (dirtyRef.current && !deletedRef.current) {
      LOG('flushSave() → flushing pending edit')
      save()
    }
  }, [save, LOG])

  // ── Live broadcast mirror (writer → viewers) ────────────────────────────────

  /** Apply mirrored content from the writer WITHOUT scheduling a save (viewers never write).
   *  When the writer includes their current saved version, we update versionRef so that
   *  if we later receive the pen, our first save uses the correct baseline version. */
  const applyRemoteContent = useCallback((html: string, version?: number) => {
    contentRef.current = html
    setContentState(html)
    if (version !== undefined) {
      LOG(`applyRemoteContent() → version synced to ${version}`)
      versionRef.current = version
    }
  }, [LOG])

  /** Throttled HTML + version broadcast — only fires while I hold the pen.
   *  Viewers receive the version alongside content so their versionRef stays
   *  current; if they later receive the pen, they write from the correct baseline. */
  const scheduleBroadcast = useCallback(() => {
    if (!editingRef.current) return
    if (broadcastTimer.current) return
    broadcastTimer.current = setTimeout(() => {
      broadcastTimer.current = null
      const ch = channelRef.current
      if (ch && editingRef.current) {
        ch.send({
          type: 'broadcast',
          event: 'content',
          payload: { html: contentRef.current, version: versionRef.current },
        })
      }
    }, BROADCAST_THROTTLE_MS)
  }, [])

  const setTitle = useCallback((t: string) => {
    titleRef.current = t
    setTitleState(t)
    scheduleSave()
  }, [scheduleSave])

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
  const release = useCallback(() => {
    LOG('release() → dropping pen')
    // flushSave BEFORE applyLocalEditingState: save() now checks editingRef.current,
    // so the final flush must happen while we still hold the pen. Swapping the order
    // would skip the flush and lose the writer's last keystrokes.
    flushSave()
    applyLocalEditingState(false)
    const ch = channelRef.current
    if (ch) {
      // Final content sync so the incoming writer starts from a clean baseline.
      ch.send({
        type: 'broadcast',
        event: 'content',
        payload: { html: contentRef.current, version: versionRef.current },
      })
      // Instant "pen is free" signal — doesn't wait for Presence GC (which can be slow).
      ch.send({
        type: 'broadcast',
        event: 'pen-released',
        payload: { userId: meRef.current.userId, displayName: meRef.current.displayName },
      })
    }
    trackPresence(false)
    setPendingRequest(null)
  }, [applyLocalEditingState, flushSave, trackPresence, LOG])

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
  const acceptRequest = useCallback(() => {
    const ch = channelRef.current
    const req = pendingRequestRef.current
    if (!ch || !req) {
      LOG('acceptRequest() → no channel or no pending request')
      return
    }
    LOG(`acceptRequest() → handing pen to ${req.displayName} (${req.userId})`)
    flushSave()
    applyLocalEditingState(false)
    setLockState({ status: 'other', who: req.displayName })
    // Send the freshly-saved content + current version first so the requester edits
    // from a clean, correctly-versioned baseline, then release the pen, then grant.
    ch.send({
      type: 'broadcast',
      event: 'content',
      payload: { html: contentRef.current, version: versionRef.current },
    })
    ch.send({
      type: 'broadcast',
      event: 'pen-released',
      payload: { userId: meRef.current.userId, displayName: meRef.current.displayName },
    })
    trackPresence(false)
    // Grant is addressed to one userId — no other client reacts to it.
    ch.send({ type: 'broadcast', event: 'grant', payload: { to: req.userId } })
    setPendingRequest(null)
  }, [applyLocalEditingState, flushSave, trackPresence, LOG])

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

  // ── Channel lifecycle: presence + broadcast for this note ────────────────────
  useEffect(() => {
    if (!user || !id) return
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
          color: (m.color as string | undefined) ?? FALLBACK_COLOR,
          editing: m.editing === true,
        }
      })
      setPresenceUsers(users)

      const me = meRef.current.userId
      const editingIds = users.filter((u) => u.editing).map((u) => u.id)

      LOG(`presence sync → ${users.length} user(s) present, editing: [${editingIds.join(', ')}]`)

      // Acquire-race tiebreak: if more than one client thinks it holds the pen, the
      // client whose userId is NOT lexicographically smallest yields. Stable winner.
      if (editingIds.length > 1 && editingRef.current) {
        const winner = [...editingIds].sort()[0]
        if (me !== winner) {
          LOG(`presence sync → race tiebreak: yielding pen to ${winner}`)
          editingRef.current = false
          trackPresence(false)
          return
        }
      }

      if (editingIds.includes(me)) {
        setLockState({ status: 'me' })
      } else if (editingIds.length > 0) {
        const other = users.find((u) => u.editing && u.id !== me)
        setLockState({ status: 'other', who: other?.displayName ?? 'Someone' })
        LOG(`presence sync → lock held by: ${other?.displayName ?? 'Someone'}`)
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
        ch.send({
          type: 'broadcast',
          event: 'content',
          payload: { html: contentRef.current, version: versionRef.current },
        })
        LOG(`presence join → pushed current content to new observer (${newest?.displayName})`)
      }
    })

    ch.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      const p = leftPresences[0] as Partial<PresenceUser> | undefined
      LOG(`presence leave → key=${key} displayName=${p?.displayName}`)
      // Remove the departed user from the avatar list immediately — don't wait for the
      // next presence.sync (which fires after Supabase GC and can lag several seconds).
      setPresenceUsers((current) => current.filter((u) => u.id !== key))
      // When a presence entry leaves entirely (user closed tab / navigated away without
      // sending pen-released), clear the lock immediately rather than waiting for GC.
      if (!editingRef.current) {
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
        applyRemoteContent(payload.html as string, payload.version as number | undefined)
      }
    })

    // ── Broadcast: pen-released — instant "lock is free" for viewers ──────────
    // Sent by the writer on release() / acceptRequest() / unmount. Faster than
    // waiting for Supabase Presence GC (which can lag several seconds).
    ch.on('broadcast', { event: 'pen-released' }, ({ payload }) => {
      const from = payload?.displayName ?? payload?.userId ?? 'unknown'
      LOG(`pen-released received from ${from}`)
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
        LOG('grant → not addressed to me, ignoring')
        return
      }
      if (cancelled) return

      clearRequesterTimeout()

      // Re-fetch the DB version before taking the pen. The granting writer flushed
      // their save and sent a final 'content' broadcast — but in rare out-of-order
      // delivery we might have missed it. A lightweight select ensures our first save
      // uses the correct baseline version.
      try {
        const { data } = await supabase.from('files').select('version').eq('id', id).single()
        if (data && !cancelled) {
          LOG(`grant → refreshed version from DB: ${data.version}`)
          versionRef.current = data.version
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
          setIsLive(true)
          setIsOffline(false)
          // Join presence as a viewer first; auto-acquire (if free + can edit) fires
          // on the next sync event via the separate auto-acquire useEffect.
          await ch.track({
            userId: meRef.current.userId,
            displayName: meRef.current.displayName,
            color: meRef.current.color,
            editing: false,
          })
          LOG('channel → tracked presence (editing=false), waiting for sync to auto-acquire')
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          LOG(`channel → went offline (${status})`)
          setIsOffline(true)
        }
      })
    })()

    const authTimer = setInterval(() => {
      supabase.realtime.setAuth().catch(() => { LOG('auth refresh failed (non-fatal)') })
    }, REALTIME_AUTH_REFRESH_MS)

    return () => {
      cancelled = true
      clearInterval(authTimer)
      if (broadcastTimer.current) { clearTimeout(broadcastTimer.current); broadcastTimer.current = null }
      if (declineTimer.current) { clearTimeout(declineTimer.current); declineTimer.current = null }
      if (requesterTimeoutTimer.current) { clearTimeout(requesterTimeoutTimer.current); requesterTimeoutTimer.current = null }

      LOG(`channel cleanup → editingRef=${editingRef.current}`)

      if (editingRef.current) {
        flushSave()
        // Final content sync + instant pen-released signal before we disconnect.
        // Supabase Presence GC can take several seconds after untrack(); the broadcast
        // ensures viewers update immediately so they don't see stale "X is editing".
        ch.send({
          type: 'broadcast',
          event: 'content',
          payload: { html: contentRef.current, version: versionRef.current },
        })
        ch.send({
          type: 'broadcast',
          event: 'pen-released',
          payload: { userId: meRef.current.userId, displayName: meRef.current.displayName },
        })
        LOG('channel cleanup → sent pen-released broadcast before disconnect')
      }

      editingRef.current = false
      autoAcquiredRef.current = false
      hasSyncedOnce.current = false
      setPresenceUsers([])
      setLockState({ status: 'free' })
      setPendingRequest(null)
      setIsOffline(false)
      channelRef.current = null
      setIsLive(false)

      void (async () => {
        try { await ch.untrack() } catch { /* best-effort leave signal */ }
        await supabase.removeChannel(ch)
        LOG('channel cleanup → channel removed')
      })()
    }
  }, [id, user?.id, supabase, applyRemoteContent, applyLocalEditingState, flushSave, trackPresence, clearRequesterTimeout, LOG])

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

      // Resolve this user's permission: owner if they own it, otherwise the
      // permission on their share row (default 'view'). Owner needs no extra query.
      let resolved: FilePermission = 'view'
      if (data.owner_id === user?.id) {
        resolved = 'owner'
      } else if (user) {
        const { data: shareRow } = await supabase
          .from('shares')
          .select('permission')
          .eq('resource_type', 'file')
          .eq('resource_id', id)
          .eq('shared_with', user.id)
          .limit(1)
          .maybeSingle()
        resolved = (shareRow?.permission as 'view' | 'edit' | undefined) ?? 'view'
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
  }, [id, supabase, save, user?.id, LOG])

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
  }
}
