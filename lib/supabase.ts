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
  return supabase
}
