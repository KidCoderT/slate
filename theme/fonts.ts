/**
 * Font family names — the exact strings @expo-google-fonts registers (per-weight static
 * fonts, so the weight lives in the family name, not a fontWeight prop). Loaded in
 * app/_layout.tsx via useFonts. See APP_AESTHETIC.md §3.
 *
 * Space Grotesk = display (wordmark, titles, headings). Geist = UI + reading.
 */
export const fonts = {
  display: 'SpaceGrotesk_600SemiBold',     // section headings, page/note titles
  displayBold: 'SpaceGrotesk_700Bold',     // wordmark
  ui: 'Geist_400Regular',                  // body, reading, preview, meta
  uiMedium: 'Geist_500Medium',             // labels
  uiSemibold: 'Geist_600SemiBold',         // card/list titles, block actions
} as const
