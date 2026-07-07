/**
 * Canonical colour palette for the TS/runtime world — lucide icon `color=` props,
 * TextInput `placeholderTextColor`/`selectionColor`, StyleSheet, Animated.
 * For className styling use the Tailwind tokens (tailwind.config.js mirrors this file).
 * Single source of truth — never hardcode a hex anywhere else.
 *
 * Direction C ("Stone & structure"): a cool blue-grey ramp with real tonal depth,
 * a true near-black anchor (`ink`), and VISIBLE structural hairlines (`divider`,
 * `crumb`) that do the separating instead of whisper shadows. See APP_AESTHETIC.md §2.
 * Token names are retained from v1; only values shifted (cooler + higher-contrast).
 */
export const colors = {
  ink: '#16181D',        // primary text, wordmark, the true-black moment (FAB fill, active)
  inkMuted: '#767E8A',   // preview / meta — cool (replaces the warm #9E9890)
  inkSubtle: '#565D67',  // secondary text (sub-headings, quiet-but-readable)
  canvas: '#E9EBEE',     // app bg — cool stone, deep enough that white surfaces + rules pop
  surface: '#FFFFFF',    // cards, note container, inputs
  surfaceRaised: '#F4F5F7', // raised / pressed surface, code blocks (cool)
  divider: '#D7DAE0',    // STRUCTURAL hairline — visible, not a whisper
  crumb: '#C2C7CF',      // stronger structural rule / breadcrumb separators
  searchBg: '#E1E4E9',   // search container tint (cool, between canvas and divider)
  placeholder: '#A6ACB6', // placeholder text + passive icons
  emptyFaint: '#B4BAC3', // secondary line in empty states (cool)
  icon: '#8A919C',       // nav / chrome icons — cool grey
  // Semantic accents — the only non-monochrome values permitted (APP_AESTHETIC §2)
  presence: '#6BBF94', // saved/synced + active-editing dot
  danger: '#D64545',   // destructive / "couldn't save"
} as const
