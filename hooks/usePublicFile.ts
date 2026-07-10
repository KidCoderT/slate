import { useSupabase } from '@/lib/supabase'
import type { File } from '@/types/db'
import { useEffect, useState } from 'react'

/**
 * A single public note by its slug — NO auth required. RLS's public-select policy
 * (files where is_public = true, migration 0005) authorizes the anon read, so this
 * resolves for signed-out visitors. `.maybeSingle()` returns null (not an error) for a
 * missing/unpublished slug so the viewer can render a clean "not available" state.
 *
 * ponytail: no realtime — a public view is a snapshot; add a channel only if live
 * public updates are ever wanted.
 */
export function usePublicFile(slug: string | undefined) {
  const supabase = useSupabase()
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error: queryError } = await supabase
        .from('files')
        .select('*')
        .eq('public_slug', slug)
        .eq('is_public', true)
        .maybeSingle()
      if (cancelled) return
      if (queryError) setError(new Error(queryError.message))
      else {
        setFile(data)
        setError(null)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, slug])

  return { file, isLoading, error }
}
