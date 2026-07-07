/**
 * Canonical colour palettes for Slate's two themes.
 *
 *   - LIGHT = Direction C ("Stone & structure"): cool stone, true-black-anchored.
 *   - DARK  = Direction B ("Graphite, dark-first"): off-white on near-black graphite.
 *
 * Both share identical token NAMES — only values differ — so a re-theme is a value swap.
 *
 * TWO consumption paths:
 *   1. `className` styling (majority) → Tailwind tokens resolve to CSS variables
 *      (`rgb(var(--color-ink) / <alpha>)`), switched by the root `vars()` wrapper in
 *      `theme/ThemeProvider.tsx`. Zero per-component work; every `text-ink` themes itself.
 *   2. Runtime (StyleSheet, lucide `color=`, TextInput props, WebView CSS) → read the active
 *      palette object via `useThemeColors()` (from ThemeProvider). Never import a fixed palette
 *      for a themed value.
 *
 * `colors` (default) aliases DARK so any not-yet-migrated / legacy runtime spot still compiles
 * and looks reasonable in the default dark identity. Prefer `useThemeColors()` for themed values.
 */

export type ThemeColors = {
  ink: string
  inkMuted: string
  inkSubtle: string
  canvas: string
  surface: string
  surfaceRaised: string
  divider: string
  crumb: string
  searchBg: string
  placeholder: string
  emptyFaint: string
  icon: string
  presence: string
  danger: string
}

// LIGHT — Direction C
export const lightColors = {
  ink: '#16181D',
  inkMuted: '#767E8A',
  inkSubtle: '#565D67',
  canvas: '#E9EBEE',
  surface: '#FFFFFF',
  surfaceRaised: '#F4F5F7',
  divider: '#D7DAE0',
  crumb: '#C2C7CF',
  searchBg: '#E1E4E9',
  placeholder: '#A6ACB6',
  emptyFaint: '#B4BAC3',
  icon: '#8A919C',
  presence: '#6BBF94',
  danger: '#D64545',
} as const satisfies ThemeColors

// DARK — Direction B
export const darkColors = {
  ink: '#F2F3F5',
  inkMuted: '#9AA1AC',
  inkSubtle: '#6E7580',
  canvas: '#0F1114',
  surface: '#17191E',
  surfaceRaised: '#1F222A',
  divider: '#2A2D34',
  crumb: '#363A42',
  searchBg: '#1C1F25',
  placeholder: '#5E6570',
  emptyFaint: '#4A5059',
  icon: '#8A919C',
  presence: '#6BBF94',
  danger: '#E5484D',
} as const satisfies ThemeColors

/** Default palette for legacy/un-migrated runtime spots — the dark identity. */
export const colors = darkColors

// ── CSS-variable maps (className path) ──────────────────────────────────────
// Only the 12 monochrome tokens map to Tailwind tokens; presence/danger stay runtime-only.
const TOKEN_TO_VAR: [keyof ThemeColors, string][] = [
  ['ink', '--color-ink'],
  ['inkMuted', '--color-ink-muted'],
  ['inkSubtle', '--color-ink-subtle'],
  ['canvas', '--color-canvas'],
  ['surface', '--color-surface'],
  ['surfaceRaised', '--color-surface-raised'],
  ['divider', '--color-divider'],
  ['crumb', '--color-crumb'],
  ['searchBg', '--color-search-bg'],
  ['placeholder', '--color-placeholder'],
  ['emptyFaint', '--color-empty-faint'],
  ['icon', '--color-icon'],
]

/** "#RRGGBB" → "r g b" triplet for `rgb(var(--x) / <alpha>)` and WebView :root var blocks. */
export function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

function toVars(c: ThemeColors): Record<string, string> {
  return Object.fromEntries(TOKEN_TO_VAR.map(([k, v]) => [v, hexToRgbTriplet(c[k])]))
}

export const lightVars = toVars(lightColors)
export const darkVars = toVars(darkColors)
