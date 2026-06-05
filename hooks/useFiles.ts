import { useSupabase } from '@/lib/supabase'
import type { File } from '@/types/db'
import { useUser } from '@clerk/expo'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'

/**
 * Files the signed-in user owns. All files-table reads/creates live here
 * (CODE_STYLE §4 — no supabase.from() in components).
 *
 *   useFiles()      → every file the user owns
 *   useFiles(null)  → root-level files only (folder_id is null)
 *   useFiles(id)    → files inside that folder
 *
 * Milestone B: a postgres_changes subscription keeps the list live; focus-refetch
 * stays as a harmless fallback (requires `files` in the realtime publication —
 * see 0004_realtime.sql).
 */
export function useFiles(folderId?: string | null) {
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

    let query = supabase
      .from('files')
      .select('*')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })

    if (folderId === null) query = query.is('folder_id', null)
    else if (folderId !== undefined) query = query.eq('folder_id', folderId)

    const { data, error: queryError } = await query

    if (queryError) {
      setError(new Error(queryError.message))
    } else {
      setFiles(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [supabase, user?.id, folderId])

  // Refetch whenever the screen regains focus (e.g. returning from the editor).
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  // Live updates: any change to this user's files re-pulls the list. Lists are small,
  // so a refetch on each event is simpler and more robust than per-event patching.
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`files-owner:${user.id}:${folderId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files', filter: `owner_id=eq.${user.id}` },
        () => { refetch() },
      )
    ;(async () => {
      try { await supabase.realtime.setAuth() } catch { /* non-fatal */ }
      ch.subscribe()
    })()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, user?.id, folderId, refetch])

  /** Inserts a blank note and returns its id. The FK files.owner_id → profiles.id
   *  requires the profile row to exist — useProfile (mounted on Home) guarantees it. */
  const createFile = useCallback(
    async (folder_id: string | null = null): Promise<string | null> => {
      if (!user) return null
      const { data, error: insertError } = await supabase
        .from('files')
        .insert({ owner_id: user.id, folder_id, title: '', content: '' })
        .select('id')
        .single()

      if (insertError) {
        setError(new Error(insertError.message))
        return null
      }
      return data.id
    },
    [supabase, user?.id],
  )

  return { files, isLoading, error, refetch, createFile }
}
