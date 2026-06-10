/**
 * Canonical colour palette for the TS/runtime world — lucide icon `color=` props,
 * TextInput `placeholderTextColor`/`selectionColor`, StyleSheet, Animated.
 * For className styling use the Tailwind tokens (tailwind.config.js mirrors this file).
 * Single source of truth — never hardcode a hex anywhere else.
 */
export const colors = {
  ink: '#1A1A1A',
  inkMuted: '#9E9890',
  inkSubtle: '#6B6B6B',
  canvas: '#F0F1F4',
  surface: '#FFFFFF',
  surfaceRaised: '#FAFAF8',
  divider: '#E8E8E6',
  crumb: '#D4D4D2',
  searchBg: '#E6E7EA',
  placeholder: '#B4B6BB',
  emptyFaint: '#C8C8C6',
  icon: '#ADADAB',
  // Semantic accents — the only non-monochrome values permitted (APP_AESTHETIC §2)
  presence: '#6BBF94', // saved/synced + active-editing dot
  danger: '#D64545',   // destructive / "couldn't save"
} as const
