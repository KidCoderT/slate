import { loadThemePref, saveThemePref, type ThemePref } from '@/lib/themeStore'
import { darkColors, darkVars, lightColors, lightVars, type ThemeColors } from '@/theme/colors'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme, vars } from 'nativewind'
import { createContext, useContext, useEffect, useState } from 'react'
import { View } from 'react-native'

// Precompute the CSS-variable style objects once (className path — see theme/colors.ts).
const themeStyle = {
  light: vars(lightVars),
  dark: vars(darkVars),
}

type ThemeContextValue = {
  pref: ThemePref                 // user's choice: 'system' | 'light' | 'dark'
  scheme: 'light' | 'dark'        // the RESOLVED scheme currently rendering
  colors: ThemeColors             // active runtime palette (StyleSheet / icon props / WebView)
  setPref: (pref: ThemePref) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Wraps the app in a themed root. Drives BOTH consumption paths:
 *   - className: applies the `vars()` style for the resolved scheme to a full-flex root View,
 *     so every `rgb(var(--color-*))` Tailwind token resolves and themes automatically.
 *   - runtime: exposes the active palette object + setter via `useTheme` / `useThemeColors`.
 * Preference is persisted (themeStore) and re-applied on launch; 'system' follows the device.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme()
  const [pref, setPrefState] = useState<ThemePref>('system')

  // Re-apply the saved preference on launch.
  useEffect(() => {
    loadThemePref().then((saved) => {
      setPrefState(saved)
      setColorScheme(saved)
    })
    // setColorScheme is stable; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setPref = (next: ThemePref) => {
    setPrefState(next)
    setColorScheme(next)
    void saveThemePref(next)
  }

  // NativeWind resolves 'system' to the concrete device scheme; default to light if unset.
  const scheme: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light'
  const colors = scheme === 'dark' ? darkColors : lightColors

  return (
    <ThemeContext.Provider value={{ pref, scheme, colors, setPref }}>
      {/* Follows the RESOLVED app scheme (not the device) so a manual override stays legible. */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={themeStyle[scheme]} className="flex-1">
        {children}
      </View>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}

/** Convenience — the active runtime palette for StyleSheet / icon props / WebView CSS. */
export function useThemeColors(): ThemeColors {
  return useTheme().colors
}
