import { useNotificationNav } from '@/hooks/useNotificationNav'
import { ProfileProvider } from '@/context/ProfileContext'
import { useAuth } from '@clerk/expo'
import { Redirect, Stack } from 'expo-router'
import { Platform } from 'react-native'

/** Null renderer that wires push-tap → note navigation once the Stack is mounted.
 *  Native-only: `useLastNotificationResponse` isn't available on web (it throws). */
function NotificationNav() {
  useNotificationNav()
  return null
}

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) return null
  if (!isSignedIn) return <Redirect href="/sign-in" />

  // ProfileProvider sits inside the auth gate so `user` is always defined inside it.
  // Every screen in (app)/ gets the profile via useProfileContext() at zero extra cost.
  return (
    <ProfileProvider>
      {Platform.OS !== 'web' && <NotificationNav />}
      <Stack screenOptions={{ headerShown: false }} />
    </ProfileProvider>
  )
}
