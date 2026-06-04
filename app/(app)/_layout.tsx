import { ProfileProvider } from '@/context/ProfileContext'
import { useAuth } from '@clerk/expo'
import { Redirect, Stack } from 'expo-router'

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) return null
  if (!isSignedIn) return <Redirect href="/sign-in" />

  // ProfileProvider sits inside the auth gate so `user` is always defined inside it.
  // Every screen in (app)/ gets the profile via useProfileContext() at zero extra cost.
  return (
    <ProfileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ProfileProvider>
  )
}
