import { useSupabase } from '@/lib/supabase'
import type { File } from '@/types/db'
import { useUser } from '@clerk/expo'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

/**
 * Public notes the signed-in user has opened via link ("Viewed" on Home). Bookmarks
 * live in viewed_files (0012) — a separate log from `shares`, since a public note's
 * opener already has read access; this only makes the note reappear in their workspace.
 *
 * Two-step like useSharedFiles: viewed_files.file_id is a plain uuid with no embeddable
 * PostgREST join here, so read the ids, then fetch the files (order preserved).
 *
 * ponytail: focus-refetch only, no realtime — bookmarks are created on the public
 * viewer (a different surface); Home refreshes on focus, which is when it matters.
 */
export function useViewedFiles() {
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
    const { data: rows, error: rowsError } = await supabase
      .from('viewed_files')
      .select('file_id')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })

    if (rowsError) {
      setError(new Error(rowsError.message))
      setLoading(false)
      return
    }

    const ids = (rows ?? []).map((r) => r.file_id)
    if (ids.length === 0) {
      setFiles([])
      setError(null)
      setLoading(false)
      return
    }

    const { data, error: queryError } = await supabase.from('files').select('*').in('id', ids)
    if (queryError) {
      setError(new Error(queryError.message))
    } else {
      // .in() doesn't preserve the viewed_at ordering — re-sort to match `ids`.
      const byId = new Map((data ?? []).map((f) => [f.id, f]))
      setFiles(ids.map((id) => byId.get(id)).filter((f): f is File => !!f))
      setError(null)
    }
    setLoading(false)
  }, [supabase, user?.id])

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  /** Bookmark a public note the user just opened. Idempotent (PK = user_id,file_id). */
  const recordView = useCallback(
    async (fileId: string) => {
      if (!user) return
      await supabase
        .from('viewed_files')
        .upsert({ user_id: user.id, file_id: fileId }, { onConflict: 'user_id,file_id' })
    },
    [supabase, user?.id],
  )

  return { files, isLoading, error, recordView, refetch }
}
