// Per-user avatar identity colours — the one permitted non-monochrome use in Slate
// (APP_AESTHETIC §2: "avatar identity circles"). Used everywhere a user is represented:
// the header ProfileButton, the ShareSheet owner row, and live-editing presence avatars.
//
// This is the SINGLE source of truth for the palette. The 0003_profile_colour.sql
// backfill array MUST stay byte-identical to AVATAR_COLORS below.
//
// Note: #6BBF94 is deliberately NOT in this list — that green is reserved for the
// "saved / active-editing" *status* dot (APP_AESTHETIC §2), so using it as an identity
// colour would be a confusing collision.

// Initials sit on the saturated identity colours above — always white, in BOTH themes.
// Part of the identity-colour system (the hardcoded-hex exemption), not a theme token.
export const AVATAR_TEXT = '#FFFFFF'

export const AVATAR_COLORS = [
  '#4A87D6', // cobalt blue
  '#8A6DD1', // violet
  '#D4614A', // coral
  '#C4901C', // amber
  '#CC5C92', // rose
  '#3CAF82', // emerald
] as const

/** Deterministic palette pick from a seed (e.g. an email). Used as the fallback colour
 *  for users whose real `profile.color` isn't readable (profiles RLS is own-row only). */
export function avatarColorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/** A random palette colour, assigned to a profile when its row is first created. */
export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}
