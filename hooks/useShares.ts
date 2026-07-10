import { useProfileContext } from '@/context/ProfileContext'
import { sendShareEmail } from '@/lib/notify'
import { makeSlug } from '@/lib/slug'
import { useSupabase } from '@/lib/supabase'
import type { Share } from '@/types/db'
import { useCallback, useEffect, useState } from 'react'

type ResourceType = 'file' | 'folder'

/** Outcome of addShare so the UI can phrase feedback. */
export type AddShareResult =
  | { ok: true; existingUser: boolean }
  | { ok: false; message: string }

/**
 * Owner-side share management for one resource (CODE_STYLE §4 — all shares-table
 * access lives here). Lists current shares and lets the owner grant, revoke, and
 * change permission. Sharing to an email with no account writes a pending invite
 * (shared_with = null) — it never fails.
 */
export function useShares(resourceType: ResourceType, resourceId: string, fileName: string) {
  const supabase = useSupabase()
  const { profile } = useProfileContext()
  const [shares, setShares] = useState<Share[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  // Public-link state (files only). is_public + public_slug already exist on `files`
  // (0001); this hook owns the toggle so no component writes files directly (CODE_STYLE §4).
  const [isPublic, setIsPublic] = useState(false)
  const [publicSlug, setPublicSlug] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('shares')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(new Error(queryError.message))
    } else {
      setShares(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [supabase, resourceType, resourceId])

  useEffect(() => {
    refetch()
  }, [refetch])

  // Load the file's public-link state (files only).
  const refetchFile = useCallback(async () => {
    if (resourceType !== 'file') return
    const { data } = await supabase
      .from('files')
      .select('is_public, public_slug')
      .eq('id', resourceId)
      .maybeSingle()
    if (data) {
      setIsPublic(data.is_public)
      setPublicSlug(data.public_slug)
    }
  }, [supabase, resourceType, resourceId])

  useEffect(() => {
    refetchFile()
  }, [refetchFile])

  /** Turn the public view-only link on/off. Generates a slug on first enable and keeps
   *  it when disabling (so re-enabling gives the same URL). Retries once on the rare
   *  unique(public_slug) collision. */
  const togglePublic = useCallback(
    async (next: boolean) => {
      if (resourceType !== 'file') return
      const patch: { is_public: boolean; public_slug?: string } = { is_public: next }
      if (next && !publicSlug) patch.public_slug = makeSlug(fileName)

      const { error: updateError } = await supabase.from('files').update(patch).eq('id', resourceId)
      if (updateError) {
        if (patch.public_slug) {
          const retry = makeSlug(fileName)
          const { error: retryError } = await supabase
            .from('files')
            .update({ is_public: true, public_slug: retry })
            .eq('id', resourceId)
          if (retryError) return setError(new Error(retryError.message))
          setPublicSlug(retry)
          setIsPublic(true)
          return
        }
        return setError(new Error(updateError.message))
      }
      if (patch.public_slug) setPublicSlug(patch.public_slug)
      setIsPublic(next)
    },
    [supabase, resourceType, resourceId, fileName, publicSlug],
  )

  const addShare = useCallback(
    async (rawEmail: string, permission: 'view' | 'edit' = 'view'): Promise<AddShareResult> => {
      if (!profile) return { ok: false, message: 'Not signed in.' }
      const email = rawEmail.trim().toLowerCase()
      if (!email || !email.includes('@')) return { ok: false, message: 'Enter a valid email.' }
      if (email === profile.email.toLowerCase()) {
        return { ok: false, message: "That's you — you already own this." }
      }

      // Does this email already have an account? (security-definer RPC)
      const { data: matches, error: rpcError } = await supabase.rpc('find_profile_by_email', {
        p_email: email,
      })
      if (rpcError) return { ok: false, message: rpcError.message }
      const existing = (matches as { id: string }[] | null)?.[0] ?? null

      const { error: upsertError } = await supabase
        .from('shares')
        .upsert(
          {
            resource_type: resourceType,
            resource_id: resourceId,
            owner_id: profile.id,
            shared_with: existing?.id ?? null,
            invited_email: email,
            permission,
          },
          { onConflict: 'resource_type,resource_id,invited_email' },
        )

      if (upsertError) return { ok: false, message: upsertError.message }

      // Email + push in one edge-function call. Push fires only when recipientId is set
      // (existing users have a device token; pending invitees don't yet).
      const sharedBy = profile.display_name ?? profile.email
      await sendShareEmail(supabase, {
        to: email,
        fileName,
        sharedBy,
        noteId: resourceId,
        recipientId: existing?.id ?? null,
      })

      await refetch()
      return { ok: true, existingUser: !!existing }
    },
    [supabase, profile, resourceType, resourceId, fileName, refetch],
  )

  const removeShare = useCallback(
    async (shareId: string) => {
      const { error: deleteError } = await supabase.from('shares').delete().eq('id', shareId)
      if (deleteError) {
        setError(new Error(deleteError.message))
        return
      }
      await refetch()
    },
    [supabase, refetch],
  )

  const setPermission = useCallback(
    async (shareId: string, permission: 'view' | 'edit') => {
      const { error: updateError } = await supabase
        .from('shares')
        .update({ permission })
        .eq('id', shareId)
      if (updateError) {
        setError(new Error(updateError.message))
        return
      }
      await refetch()
    },
    [supabase, refetch],
  )

  return {
    shares,
    isLoading,
    error,
    addShare,
    removeShare,
    setPermission,
    refetch,
    isPublic,
    publicSlug,
    togglePublic,
  }
}
