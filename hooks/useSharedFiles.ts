import { useSupabase } from '@/lib/supabase'
import type { File } from '@/types/db'
import { useUser } from '@clerk/expo'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

/**
 * Files shared WITH the signed-in user (their inbox). These rows are returned
 * only because the widened files RLS (0002_sharing.sql) grants select access via
 * a matching shares row — so "everything I can see that I don't own" == shared
 * with me. Mirrors useFiles' fetch-on-focus pattern.
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

  return { files, isLoading, error, refetch }
}
