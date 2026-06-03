import { useSupabase } from '@/lib/supabase'
import type { Profile } from '@/types/db'
import { useUser } from '@clerk/expo'
import { useEffect, useState } from 'react'

export function useProfile() {
  const { user } = useUser()
  const supabase = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const syncProfile = async () => {
      const email = user.emailAddresses[0]?.emailAddress ?? ''
      const clerkProfile: Profile = {
        id: user.id,
        email,
        display_name: user.firstName ?? user.username ?? email.split('@')[0],
        avatar_url: user.imageUrl ?? null,
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
        return
      }

      // PGRST116 = no rows found (expected on first sign-in). Any other error is a real failure.
      if (selectError && selectError.code !== 'PGRST116') {
        console.warn('[useProfile] SELECT failed:', selectError.message, '— using Clerk data')
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
        console.warn('[useProfile] INSERT failed:', insertError.message, '— using Clerk data')
        setProfile(clerkProfile)
      } else {
        setProfile(newProfile)
      }

      setLoading(false)
    }

    syncProfile()
  }, [user?.id])

  return { profile, loading }
}