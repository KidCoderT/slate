import { useAuth } from '@clerk/expo'
import { createClient } from '@supabase/supabase-js'
import { useMemo } from 'react'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export function useSupabase() {
  const { getToken } = useAuth()

  return useMemo(
    () => createClient(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => await getToken() ?? null,
    }),
    [getToken]
  )
}