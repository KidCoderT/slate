import { useSupabase } from '@/lib/supabase'
import type { File } from '@/types/db'
import { useUser } from '@clerk/expo'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'

/**
 * Files shared WITH the signed-in user (their inbox). These rows are returned
 * only because the widened files RLS (0002_sharing.sql) grants select access via
 * a matching shares row — so "everything I can see that I don't own" == shared
 * with me. Live via postgres_changes (RLS filters which events reach this user);
 * focus-refetch stays as a fallback.
 */
export function useSharedFiles() {
  const { user } = useUser()
  const supabase = useSupabase()
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('files')
      .select('*')
      .neq('owner_id', user.id)
      .order('updated_at', { ascending: false })

    if (queryError) {
      setError(new Error(queryError.message))
    } else {
      setFiles(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [supabase, user?.id])

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  // Live updates: refetch on any files change the RLS policy lets this user see.
  // No owner filter — shared rows aren't owner-keyed; RLS scopes the event stream.
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`files-shared:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files' },
        () => { refetch() },
      )
    ;(async () => {
      try { await supabase.realtime.setAuth() } catch { /* non-fatal */ }
      ch.subscribe()
    })()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, user?.id, refetch])

  return { files, isLoading, error, refetch }
}
