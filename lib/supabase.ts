import { useAuth } from '@clerk/expo'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Module-level token getter. Updated on every render by any hook that calls
// useSupabase(). The singleton's accessToken callback reads from here, so the
// Clerk JWT is always fresh even after token rotation — without recreating the client.
let _getToken: (() => Promise<string | null>) | null = null

/**
 * Singleton Supabase client — one WebSocket connection per app session.
 *
 * Previously, each hook that called useSupabase() got its own createClient()
 * instance, which opened a separate WebSocket to Supabase Realtime. On a note
 * screen with useFileSync + useFiles + useSharedFiles that was 3+ connections —
 * wasteful and approaching free-tier limits under concurrent users. The singleton
 * eliminates duplicate connections while keeping auth current via _getToken.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => (await _getToken?.()) ?? null,
})

// Clerk session tokens are ~60s-lived; refresh the realtime socket auth before they
// expire so Presence/Broadcast/postgres_changes RLS keeps passing during long sessions.
// One app-wide timer — hooks must NOT run their own setAuth() intervals (it would just
// multiply Clerk token fetches against the same singleton socket). Skips the call
// entirely while no channels are open.
const REALTIME_AUTH_REFRESH_MS = 50_000
let authRefreshTimer: ReturnType<typeof setInterval> | null = null

function ensureRealtimeAuthRefresh() {
  if (authRefreshTimer) return
  authRefreshTimer = setInterval(() => {
    if (supabase.getChannels().length === 0) return
    supabase.realtime.setAuth().catch(() => { /* non-fatal — retried next tick */ })
  }, REALTIME_AUTH_REFRESH_MS)
}

/**
 * Returns the singleton Supabase client and keeps the Clerk auth token current.
 *
 * Call from every hook that needs Supabase — identical to the previous API.
 * The only change from the caller's perspective is that all calls now return
 * the same stable object reference, so dependency arrays that include `supabase`
 * will never trigger a re-render due to client identity changing.
 */
export function useSupabase() {
  const { getToken } = useAuth()
  // Synchronous ref update on every render — same pattern as the old
  // `getTokenRef.current = getToken`. React considers ref mutations during
  // render acceptable (no side-effect tracking, no double-invoke issue).
  _getToken = () => getToken()
  ensureRealtimeAuthRefresh()
  return supabase
}
