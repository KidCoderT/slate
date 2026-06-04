import { useAuth } from '@clerk/expo'
import { createClient } from '@supabase/supabase-js'
import { useMemo, useRef } from 'react'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export function useSupabase() {
  const { getToken } = useAuth()

  // Keep the latest getToken in a ref so the accessToken callback is never stale,
  // but the ref itself is stable — so useMemo([], ...) creates the client exactly
  // once per session. Without this, Clerk returns a new getToken reference on every
  // render, which previously caused useMemo to create a new client each render,
  // which cascaded into an infinite refetch loop via useFiles → useFocusEffect.
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  return useMemo(
    () => createClient(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => (await getTokenRef.current?.()) ?? null,
    }),
    [], // intentionally empty — client is created once per mount
  )
}
