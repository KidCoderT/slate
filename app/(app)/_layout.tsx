import { useAuth } from '@clerk/expo'
import { Redirect, Stack } from 'expo-router'

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) return null

  // not signed in — kick them to login
  if (!isSignedIn) return <Redirect href="/sign-in" />

  return <Stack screenOptions={{ headerShown: false }} />
}