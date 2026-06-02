import { useSupabase } from '@/lib/supabase'
import { useUser } from '@clerk/expo'
import { useEffect, useState } from 'react'

type Profile = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
}

export function useProfile() {
  const { user } = useUser()
  const supabase = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const syncProfile = async () => {
      const email = user.emailAddresses[0].emailAddress
      const clerkProfile: Profile = {
        id: user.id,
        email,
        display_name: user.firstName ?? user.username ?? email.split('@')[0],
        avatar_url: user.imageUrl ?? null,
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

      if (selectError) console.warn('[useProfile] SELECT failed:', selectError.message)

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