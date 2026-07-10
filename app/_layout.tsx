import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from '@expo-google-fonts/geist';
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import "../global.css";

WebBrowser.maybeCompleteAuthSession();

// Keep the splash up until fonts are ready — no fallback-font flash (APP_AESTHETIC §3).
SplashScreen.preventAutoHideAsync();

// Show share-invite pushes as a banner even while the app is foregrounded (default is silent).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  // Render nothing until fonts resolve (or fail) — the splash covers this frame.
  if (!fontsLoaded && !fontError) return null

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ThemeProvider>
        {/* StatusBar is rendered inside ThemeProvider, driven by the resolved scheme. */}
        <Slot />
      </ThemeProvider>
    </ClerkProvider>
  )
}
