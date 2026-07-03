import { useSupabase } from '@/lib/supabase'
import type { Pen } from '@/types/db'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** Who holds the pen, derived purely from the pens DB row. */
export type LockState =
  | { status: 'free' }
  | { status: 'me' }
  | { status: 'other'; who: string }

// Lease TTL is 15s (set server-side in claim_pen); re-claiming every 5s keeps a
// live holder's lease always ≥10s from expiry, and always ahead of nudge_pen's 6s floor.
const HEARTBEAT_MS = 5_000
// Client clocks are only a UI hint (claim_pen on the server is the authority);
// the buffer absorbs modest skew so we don't flash "free" under a live holder.
const EXPIRY_SKEW_MS = 2_000

/**
 * The pen state machine — a thin client for the `pens` row (0009_pens.sql), which
 * is the single source of truth for "who is writing". This hook owns no channel:
 * useFileSync routes `postgres_changes` events on the row into `applyPenRow`.
 * All mutations are REST RPCs, so the pen survives realtime socket drops.
 */
export function usePen(fileId: string, meId: string | null) {
  const supabase = useSupabase()

  const [pen, setPen] = useState<Pen | null>(null)
  // Flipped by the watchdog when a lease deadline passes with no renewal event.
  const [expired, setExpired] = useState(false)

  // Synchronous "do I hold the pen" for save/broadcast closures and cleanups —
  // the one place timers read the current truth without waiting on a render.
  const isMineRef = useRef(false)

  const meIdRef = useRef(meId)
  meIdRef.current = meId

  /** Adopt a pen row (from an RPC result or a postgres_changes event). */
  const applyPenRow = useCallback((row: Pen | null) => {
    isMineRef.current = !!row?.holder_id && row.holder_id === meIdRef.current
    setPen(row)
    setExpired(false)
  }, [])

  /** Re-pull the row (mount, rejoin resync). Events keep it live in between. */
  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('pens')
      .select('*')
      .eq('file_id', fileId)
      .maybeSingle()
    applyPenRow((data as Pen | null) ?? null)
  }, [supabase, fileId, applyPenRow])

  // Fresh note → fresh pen state, then load the current row.
  useEffect(() => {
    applyPenRow(null)
    if (fileId) void refetch()
  }, [fileId, refetch, applyPenRow])

  /** Claim the pen (or extend my lease). Returns true if I hold it afterwards.
   *  The server serializes concurrent claims — the returned row is the verdict. */
  const claim = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc('claim_pen', { p_file: fileId })
    if (error) {
      console.log(`[Pen ${fileId}] claim → failed: ${error.message}`)
      return false
    }
    applyPenRow(data as Pen)
    return isMineRef.current
  }, [supabase, fileId, applyPenRow])

  /** Drop the pen. Optimistic: the row event echoes the same state to everyone. */
  const release = useCallback(async (): Promise<void> => {
    if (!isMineRef.current) return
    applyPenRow({ file_id: fileId, holder_id: null, holder_name: null, expires_at: null })
    const { error } = await supabase.rpc('release_pen', { p_file: fileId })
    if (error) console.log(`[Pen ${fileId}] release → failed (lease will expire): ${error.message}`)
  }, [supabase, fileId, applyPenRow])

  /** Hand the pen straight to someone — it is never free in between, so nobody
   *  can steal it mid-handover. Optimistic local row so my editor locks instantly. */
  const transfer = useCallback(async (toUserId: string, toName: string): Promise<void> => {
    if (!isMineRef.current) return
    applyPenRow({
      file_id: fileId,
      holder_id: toUserId,
      holder_name: toName,
      expires_at: new Date(Date.now() + 15_000).toISOString(),
    })
    const { error } = await supabase.rpc('transfer_pen', { p_file: fileId, p_to: toUserId })
    if (error) {
      console.log(`[Pen ${fileId}] transfer → failed, keeping pen: ${error.message}`)
      void refetch() // I still hold it server-side; restore the truth
    }
  }, [supabase, fileId, applyPenRow, refetch])

  /** Fast-path reaper: the holder's presence dropped, so shorten their lease to
   *  ~6s. Can never hurt a live holder (their 5s heartbeat re-extends first). */
  const nudge = useCallback(() => {
    void supabase.rpc('nudge_pen', { p_file: fileId })
  }, [supabase, fileId])

  // ── Derived lock state ────────────────────────────────────────────────────
  // Depends on fields, not the row object, so 5s heartbeat events (which only
  // move expires_at) don't churn the memo identity or re-render consumers.
  const holderId = pen?.holder_id ?? null
  const holderName = pen?.holder_name ?? null
  const lockState: LockState = useMemo(() => {
    if (!holderId || expired) return { status: 'free' }
    if (holderId === meId) return { status: 'me' }
    return { status: 'other', who: holderName ?? 'Someone' }
  }, [holderId, holderName, expired, meId])

  // ── Expiry watchdog ───────────────────────────────────────────────────────
  // Someone else holds the pen: arm one timer at their lease deadline. Every
  // heartbeat event replaces `pen` and re-arms it; if the holder died, the timer
  // fires and the UI flips to free (claim_pen remains the real gate).
  useEffect(() => {
    if (!pen?.holder_id || !pen.expires_at) return
    if (pen.holder_id === meIdRef.current) return // my own heartbeat handles my lease
    const ms = new Date(pen.expires_at).getTime() + EXPIRY_SKEW_MS - Date.now()
    if (ms <= 0) {
      setExpired(true)
      return
    }
    const t = setTimeout(() => setExpired(true), ms)
    return () => clearTimeout(t)
  }, [pen])

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  // While I hold the pen, re-claim every 5s to extend the lease. REST, not
  // socket: the pen survives network blips and channel rebuilds untouched.
  const isMine = lockState.status === 'me'
  useEffect(() => {
    if (!isMine) return
    const t = setInterval(() => { void claim() }, HEARTBEAT_MS)
    return () => clearInterval(t)
  }, [isMine, claim])

  return {
    lockState,
    holderId,
    isMineRef,
    claim,
    release,
    transfer,
    nudge,
    applyPenRow,
    refetch,
  }
}
