import { useSupabase } from '@/lib/supabase'
import type { File } from '@/types/db'
import { useUser } from '@clerk/expo'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useId, useState } from 'react'

/**
 * Files shared WITH the signed-in user (their inbox), resolved through their own
 * shares rows. Two-step on purpose: shares.resource_id is polymorphic (no FK), so
 * PostgREST can't embed-join it — and the old single-query shortcut
 * (`files where owner_id != me`) leaked every PUBLIC note in the system into the
 * inbox, because RLS grants SELECT on any is_public row.
 * Live via postgres_changes on BOTH files (edits) and shares (grants/revokes —
 * requires 0008_shares_realtime.sql); focus-refetch stays as a fallback.
 */
export function useSharedFiles() {
  const { user } = useUser()
  const supabase = useSupabase()
  // Unique per hook instance. This hook mounts on BOTH Home and Shared-with-me,
  // which Expo Router keeps alive simultaneously — without a per-instance suffix
  // both would open the same channel topic, and supabase-js reuses a channel by
  // topic, so the second .on('postgres_changes') throws "after subscribe()".
  const instanceId = useId()
  const [files, setFiles] = useState<File[]>([])
  const [permissions, setPermissions] = useState<Record<string, 'view' | 'edit'>>({})
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: shareRows, error: sharesError } = await supabase
      .from('shares')
      .select('resource_id, permission')
      .eq('resource_type', 'file')
      .eq('shared_with', user.id)

    if (sharesError) {
      setError(new Error(sharesError.message))
      setLoading(false)
      return
    }

    const permMap: Record<string, 'view' | 'edit'> = {}
    for (const r of shareRows ?? []) permMap[r.resource_id] = r.permission
    setPermissions(permMap)
    const ids = (shareRows ?? []).map((r) => r.resource_id)
    if (ids.length === 0) {
      setFiles([])
      setError(null)
      setLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .from('files')
      .select('*')
      .in('id', ids)
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

  // Live updates: refetch on any files change the RLS policy lets this user see
  // (no owner filter — shared rows aren't owner-keyed; RLS scopes the stream), AND
  // on any shares change: a grant/revoke writes to shares, not files, so without
  // this binding a newly shared note only appeared after a manual refocus — the
  // growth-loop moment was the one place the app wasn't live. RLS scopes shares
  // INSERT/UPDATE events to rows I own or receive; DELETE events arrive PK-only to
  // all subscribers — fine, events are only ever a refetch signal (payload unread).
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`files-shared:${user.id}:${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files' },
        () => { refetch() },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shares' },
        () => { refetch() },
      )
    ;(async () => {
      try { await supabase.realtime.setAuth() } catch { /* non-fatal */ }
      ch.subscribe()
    })()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, user?.id, instanceId, refetch])

  return { files, permissions, isLoading, error, refetch }
}
