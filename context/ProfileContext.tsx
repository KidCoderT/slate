import { useSupabase } from '@/lib/supabase'
import { randomAvatarColor } from '@/theme/avatarColors'
import type { Profile } from '@/types/db'
import { useUser } from '@clerk/expo'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type ProfileContextValue = {
  profile: Profile | null
  loading: boolean
  /** Change the signed-in user's identity colour (own row only). Optimistic. */
  updateColor: (hex: string) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

/**
 * Fetches and syncs the signed-in user's profile row exactly once.
 * Mount inside app/(app)/_layout.tsx — after the auth gate — so `user` is
 * always defined here and every authenticated screen gets the profile for free.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const supabase = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // user is always defined here (ProfileProvider sits inside the auth-gated layout),
    // but guard defensively so TypeScript is happy and the hook is safe if ever moved.
    if (!user) {
      setLoading(false)
      return
    }

    // Link any invites addressed to this user's email (made before they had an
    // account) to their profile. Fire-and-forget — no UI impact. Safe to call
    // every sign-in; it only touches still-pending rows.
    const claimPendingShares = () => {
      supabase.rpc('claim_pending_shares').then(({ error }) => {
        if (error) console.warn('[ProfileContext] claim_pending_shares failed:', error.message)
      })
    }

    const syncProfile = async () => {
      const email = user.emailAddresses[0]?.emailAddress ?? ''
      const clerkProfile: Profile = {
        id: user.id,
        email,
        display_name: user.firstName ?? user.username ?? email.split('@')[0],
        avatar_url: user.imageUrl ?? null,
        // Assign a random identity colour at creation. The DB default is only a fallback.
        color: randomAvatarColor(),
        created_at: new Date().toISOString(),
      }

      const { data, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setLoading(false)
        claimPendingShares()
        return
      }

      // PGRST116 = no rows found — expected on first sign-in.
      if (selectError && selectError.code !== 'PGRST116') {
        console.warn('[ProfileContext] SELECT failed:', selectError.message, '— using Clerk data')
        setProfile(clerkProfile)
        setLoading(false)
        return
      }

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(clerkProfile)
        .select()
        .single()

      if (insertError) {
        console.warn('[ProfileContext] INSERT failed:', insertError.message, '— using Clerk data')
        setProfile(clerkProfile)
      } else {
        setProfile(newProfile)
        claimPendingShares()
      }

      setLoading(false)
    }

    syncProfile()
  }, [user?.id])

  const updateColor = async (hex: string) => {
    if (!user) return
    const previous = profile
    // Optimistic — reflect immediately, roll back on failure.
    setProfile((p) => (p ? { ...p, color: hex } : p))
    const { error } = await supabase
      .from('profiles')
      .update({ color: hex })
      .eq('id', user.id)
    if (error) {
      console.warn('[ProfileContext] updateColor failed:', error.message)
      setProfile(previous)
    }
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, updateColor }}>
      {children}
    </ProfileContext.Provider>
  )
}

/** Read the signed-in user's profile. Must be used inside ProfileProvider. */
export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfileContext must be used inside ProfileProvider')
  return ctx
}
