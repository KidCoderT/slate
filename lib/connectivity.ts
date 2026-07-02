import NetInfo from '@react-native-community/netinfo'
import { AppState } from 'react-native'
import { supabase } from './supabase'

/**
 * One app-wide watcher for the two events that silently kill realtime sessions:
 *   1. App returns to the foreground (native: JS timers were suspended, the 50s
 *      realtime auth refresh in lib/supabase.ts missed its tick, Clerk's ~60s JWT
 *      expired, and the socket was likely dropped by the OS).
 *   2. Network comes back after a loss (airplane mode, wifi drop) while foregrounded.
 *
 * On either signal it re-primes realtime auth FIRST (so channel rejoins carry a
 * fresh token), then notifies subscribers. Hooks subscribe to decide whether their
 * channel survived (supabase-js auto-rejoin) or needs a full rebuild.
 *
 * Listeners are app-lifetime singletons (like the auth-refresh interval) — hooks
 * subscribe/unsubscribe their callbacks, the underlying AppState/NetInfo listeners
 * are registered once and never torn down.
 */

type Listener = () => void

const reconnectListeners = new Set<Listener>()
const backgroundListeners = new Set<Listener>()

let started = false
let wasOnline = true

async function fireReconnect(reason: string) {
  // Fresh token BEFORE notifying — a rejoin with a stale Clerk JWT errors forever.
  try {
    await supabase.realtime.setAuth()
  } catch {
    // Non-fatal: subscribers still get notified; their rebuild path retries setAuth.
  }
  console.log(`[Connectivity] possible reconnect (${reason}) → notified ${reconnectListeners.size} listener(s)`)
  reconnectListeners.forEach((cb) => {
    try { cb() } catch { /* one bad listener must not block the rest */ }
  })
}

function ensureStarted() {
  if (started) return
  started = true

  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void fireReconnect('app foregrounded')
    } else if (state === 'background' || state === 'inactive') {
      backgroundListeners.forEach((cb) => {
        try { cb() } catch { /* see above */ }
      })
    }
  })

  NetInfo.addEventListener((state) => {
    // isConnected can be null while NetInfo is still probing — treat as online
    // so a null→true settle doesn't fire a spurious reconnect.
    const online = state.isConnected !== false
    if (online && !wasOnline) void fireReconnect('network restored')
    wasOnline = online
  })
}

/** Fires after app-foreground or offline→online, with realtime auth already re-primed. */
export function subscribeReconnect(cb: Listener): () => void {
  ensureStarted()
  reconnectListeners.add(cb)
  return () => { reconnectListeners.delete(cb) }
}

/** Fires when the app leaves the foreground — last chance to flush pending writes. */
export function subscribeAppBackground(cb: Listener): () => void {
  ensureStarted()
  backgroundListeners.add(cb)
  return () => { backgroundListeners.delete(cb) }
}
