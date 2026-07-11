import { useSupabase } from '@/lib/supabase'
import { DOWNLOAD_URL } from '@/lib/constants'
import { useEffect, useState } from 'react'

/**
 * The current "get the app" link. Backed by `app_config.latest_preview_url`
 * (0013_app_config.sql), kept current by .eas/workflows/preview-build.yml after every
 * preview build. Falls back to the static EXPO_PUBLIC_DOWNLOAD_URL env var while the
 * row hasn't loaded yet or has no value set.
 *
 * ponytail: no realtime — this changes once per build, not something a user needs
 * pushed live mid-session.
 */
export function useDownloadUrl() {
  const supabase = useSupabase()
  const [url, setUrl] = useState(DOWNLOAD_URL)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('app_config')
      .select('latest_preview_url')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.latest_preview_url) setUrl(data.latest_preview_url)
      })
    return () => {
      cancelled = true
    }
  }, [supabase])

  return url
}
