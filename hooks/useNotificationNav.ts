import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'

/**
 * Routes to the shared note when the user taps a push notification. The share-invite
 * edge function sends `data: { noteId, type: 'share' }`; this reads that payload and
 * navigates. `useLastNotificationResponse` covers both a warm tap and a cold start
 * (app opened from killed state), so no manual add/remove listeners.
 *
 * Mount inside the authed layout — the Stack navigator must exist before we push, and
 * the note route is auth-gated anyway.
 */
export function useNotificationNav() {
  const router = useRouter()
  const response = Notifications.useLastNotificationResponse()

  useEffect(() => {
    const noteId = response?.notification.request.content.data?.noteId
    if (typeof noteId === 'string') {
      router.push({ pathname: '/note/[id]', params: { id: noteId } })
    }
  }, [response, router])
}
