import { useSupabase } from '@/lib/supabase'
import { useUser } from '@clerk/expo'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

/**
 * Set of file ids the signed-in user OWNS and has shared out to at least one person.
 * Drives the "Shared" tag on Home. Public status needs no query — it's already
 * file.is_public on every row from useFiles.
 */
export function useOwnedShareMap() {
  const { user } = useUser()
  const supabase = useSupabase()
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set())

  const refetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('shares')
      .select('resource_id')
      .eq('resource_type', 'file')
      .eq('owner_id', user.id)
    setSharedIds(new Set((data ?? []).map((r) => r.resource_id)))
  }, [supabase, user?.id])

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  return sharedIds
}
