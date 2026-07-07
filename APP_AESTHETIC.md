# APP_AESTHETIC.md — Slate visual language (two themes: Light "Stone", Dark "Graphite")

> Read this before writing any component a user will see. Every UI decision in Slate is
> checked against this file. If a value isn't defined here, ask before inventing one.
>
> **This file is the single source of truth for colour, type, and spacing.** The Tailwind
> config (`tailwind.config.js`) and `theme/colors.ts` mirror it exactly. If you find a
> hardcoded hex in a component that isn't a token below, that is a bug — replace it with the token.

---

## The aesthetic in one sentence

**Slate is a precise instrument that adapts to the light — a cool-stone LIGHT mode (Direction C)
and a graphite DARK mode (Direction B), same bones. High contrast, real typographic weight, crisp
hairlines doing the work of decoration. Serious, modern, quiet. Expensive because nothing is hedged.**

Two lessons drive both themes:
1. **Conviction through contrast.** High-contrast — near-black ink on cool stone in light, off-white
   on near-black graphite in dark — never a muddy mid-grey haze. The "New note" pill is the one
   bright/dark contrast moment; it lands because everything else is quiet.
2. **Structure, not shadow.** Separation comes from **hairline rules and borders** (dark-on-light in
   light mode, light-on-dark in dark), not drop shadows. The primary action is the one elevated element.

The ground is always *cool* — cool stone in light, cool graphite in dark; never warm/beige.

**Theming is token-driven.** Every colour is a token (§2). `className` colours resolve to CSS
variables switched by the root `vars()` wrapper in `theme/ThemeProvider.tsx`; runtime values
(StyleSheet, icon `color=`, WebView CSS) come from `useThemeColors()`. Never hardcode a theme colour.
The user picks System / Light / Dark in Account (persisted); 'system' follows the device.

---

## 1. The mood board (mental reference points)

Does this feel like one of these?

- Linear / Raycast / Vercel dashboards — dark, precise, hairline structure, a strong grotesk
- A machined graphite tool — cool near-black, matte, crisp edges
- An Arc'teryx tag rendered in the dark — minimal type, confident spacing, monochrome, technical
- A luxury editorial page inverted to black — stark off-white type, dramatic scale, generous space

It does **not** feel like:
- A productivity dashboard (no colour-coded labels, no progress rings)
- A social app (no avatars everywhere, no engagement metrics)
- A Material Design app (no floating coloured circles, no chunky elevation shadows)
- A muddy low-contrast dark theme, or a warm/brown near-black

---

## 2. Colour palette — the one true list

Monochrome on a **cool** axis, in two themes that share **identical token names** — only values
differ. Both palettes live in `theme/colors.ts` (`lightColors` / `darkColors`); the Tailwind tokens
resolve to CSS variables switched per scheme (see the intro). These are the only colours.

`ink` is the strong anchor: **near-black in light, near-white in dark.** It is BOTH the primary text
colour AND the primary fill (the "New note" pill and block buttons). Text/icons placed *on* an `ink`
fill use `canvas` (so: light-on-dark in light mode, dark-on-light in dark) — see the `inverted` prop
in §3 / `components/ui/Text.tsx`.

**LIGHT — Direction C ("Stone & structure")**

| Token | Hex | Use |
|---|---|---|
| `ink` | `#16181D` | Primary text, wordmark, active icons — and strong fills (dark pill on light) |
| `ink-muted` | `#767E8A` | Preview text, metadata, secondary content |
| `ink-subtle` | `#565D67` | Secondary text, sub-headings |
| `canvas` | `#E9EBEE` | App background — cool stone; also text ON an `ink` fill |
| `surface` | `#FFFFFF` | Cards, note container, modals, inputs |
| `surface-raised` | `#F4F5F7` | Pressed/raised surface, code blocks |
| `divider` | `#D7DAE0` | Structural hairline |
| `crumb` | `#C2C7CF` | Stronger rule; breadcrumb `›`; blockquote bar |
| `search-bg` | `#E1E4E9` | Search / input tint |
| `placeholder` | `#A6ACB6` | Placeholder + passive icons |
| `empty-faint` | `#B4BAC3` | Empty-state secondary line |
| `icon` | `#8A919C` | Nav/chrome icons, non-primary UI chrome |

**DARK — Direction B ("Graphite, dark-first")**

| Token | Hex | Use |
|---|---|---|
| `ink` | `#F2F3F5` | Primary text, wordmark, active icons — and strong fills (white pill on dark) |
| `ink-muted` | `#9AA1AC` | Preview text, metadata, secondary content |
| `ink-subtle` | `#6E7580` | Secondary text, sub-headings |
| `canvas` | `#0F1114` | App background — near-black cool graphite; also text ON an `ink` fill |
| `surface` | `#17191E` | Cards, note container, modals, inputs (lifted) |
| `surface-raised` | `#1F222A` | Pressed/raised surface, code blocks |
| `divider` | `#2A2D34` | Structural hairline (lighter than surface) |
| `crumb` | `#363A42` | Stronger rule; breadcrumb `›`; blockquote bar |
| `search-bg` | `#1C1F25` | Search / input tint |
| `placeholder` | `#5E6570` | Placeholder + passive icons |
| `empty-faint` | `#4A5059` | Empty-state secondary line |
| `icon` | `#8A919C` | Nav/chrome icons, non-primary UI chrome |

> The Tailwind config does NOT hold hex — tokens are `rgb(var(--color-*) / <alpha>)`, fed by the
> CSS-variable maps in `theme/colors.ts` and applied by `ThemeProvider`. Edit values there.

**Accent colour: none.** No blue, no brand colour for chrome, labels, buttons, or decoration. The
active/selected state is an **`ink` fill with `canvas` text** — the one high-contrast moment.

**On colour in luxury design:** true luxury is the *discipline* of colour, not its absence. A single
green presence dot makes the monochrome feel intentional. Colour earns its place by being rare.

**Permitted colour uses — each carries semantic meaning, not decoration:**

| Use | Colour | Why |
|---|---|---|
| Saved / synced status dot | `#6BBF94` (`presence`) | Live confirmation — "your work is safe" |
| Active editing presence dot | `#6BBF94` (`presence`) | Live signal — "someone is in here now" |
| Avatar identity circles | Per-user palette (`theme/avatarColors.ts`, white initials) | Tell collaborators apart |
| Destructive action / save error | `#E5484D` (`danger`) | Warning — cannot be monochrome |

**Everything else is monochrome** — tokens from the table above only. If a colour isn't in this
section, it does not ship.

---

## 3. Typography — two families, real weight

Unchanged from the type system Slate already uses (it suits a dark power tool perfectly). Two
typefaces, both free via `@expo-google-fonts`, loaded in `app/_layout.tsx` and baked into
`components/ui/Text.tsx` (`theme/fonts.ts`).

- **Space Grotesk** (`display`) — wordmark, page titles, section headings, note titles. Tight tracking.
- **Geist** (`ui`) — body, labels, previews, meta, and the note *writing* body. Legible at every size.

| Role | Font | Size | Weight | Tracking | Colour |
|---|---|---|---|---|---|
| App wordmark "Slate" | Space Grotesk | 36 | 700 | −1.5 | `ink` |
| Page title (hero) | Space Grotesk | 32 | 600 | −1.0 | `ink` |
| Section heading | Space Grotesk | 20 | 600 | −0.4 | `ink` |
| Note / card title | Geist | 16 | 600 | −0.2 | `ink` |
| Body text | Geist | 16 | 400 | 0 | `ink` |
| Reading body (note editor) | Geist | 17 | 400 | 0, line-height 1.6 | `ink` |
| Preview text | Geist | 14 | 400 | 0, clamp lines | `ink-muted` |
| Caption / meta | Geist | 13 | 400 | 0 | `ink-muted` |
| Section label | Geist | 12 | 500 | +1.0 (wide) | `ink-muted` |
| Sign-in subtitle | Geist | 15 | 400 | 0 | `ink-subtle` |

**The `inverted` prop:** pass `inverted` on `Text` when it sits on an `ink` (near-white) fill — it
produces `canvas` (dark) text. Used by the "New note" pill label, the sign-in button, and the
profile-button initial.

**Rules:**
- Use scale contrast deliberately — a hero title (32) against tiny meta (13) is the editorial move.
- Section labels are always the wide-tracked ALL-CAPS label style.
- Display roles use **Space Grotesk**; every read/UI role uses **Geist**. Do not mix them up.
- No italic in the UI chrome (only inside markdown editor content).

---

## 4. Spacing and layout

Generous and unhurried. Radii are architectural (cut-stone), not pillowy.

| Token | Value | Use |
|---|---|---|
| Screen horizontal padding | 18px (`px-[18px]`, `H_PAD`) | Every screen's left/right edge |
| Web max-width | 680px, centered | Screens don't stretch on desktop |
| Section gap | 30px (`mt-[30px]`) | Between major sections |
| Card internal padding | 16px (`p-4`) | Inside cards |
| List item padding | 18px vertical, 16px horizontal | Inside NoteListItem rows |
| Bottom scroll padding | 120px | Clears the primary action |
| Icon size | 20px | Inline icons, navigation |
| Primary action ("New note" pill) | auto width × 48 height | Bottom-anchored (§5) |
| Profile button | 36px (radius 18) | Header avatar |

**Border radii:** cards / note-list container `rounded-xl` (12); inputs / search bar `rounded-xl`
(12); "New note" pill 24 (pill on 48-tall); profile button 18 (circular on 36×36).

**The structural rule motif:** a full-width hairline `divider` rule under the wordmark on home, and
wide-tracked section labels above their content. On dark, these rules are *light* — they replace
decoration.

**The grouped-card pattern:** a list lives inside ONE shared `surface` card with `rounded-xl` corners
**and a 1px `divider` border**. Rows are separated by a `hairlineWidth` `divider` line inset 16px from
the left — **no gap between rows**. The card sits on `canvas`.

```tsx
// ✅ correct — one bordered card, light divider rows, no shadow
<View className="bg-surface rounded-xl border border-divider overflow-hidden">
  <NoteListItem title="Team Intro Doc" preview="…" />
  <View className="bg-divider ml-4" style={{ height: StyleSheet.hairlineWidth }} />
  <NoteListItem title="Sprint Retrospective" preview="…" />
</View>
```

---

## 5. Interactive elements

**Primary action — the "New note" pill:**
- A bottom-anchored **`ink` (near-white) pill** with a `canvas` (dark) `Plus` icon + "New note" label.
  Not a floating Material circle.
- Height 48, pill radius, horizontal padding ~20. Positioned ~28px from the bottom. One per screen.
- The single genuinely elevated element (keeps a real shadow — §6; the contrast does most of the
  lifting on dark) and the one signature micro-interaction: a crisp spring press-scale (§8).

**Tappable rows (notes, folders):** no rest indicator, no chevrons. On press: `activeOpacity` 0.65
for rows, 0.88 for cards.

**Input fields:** bottom border only (`border-b border-divider`) at rest; `border-ink` on focus.
Placeholder in `placeholder`. Static label above the field — no floating labels.

**Full-width block actions (sign-in, sign-out):** full-width, `rounded-xl`. Primary = `ink` (near-white)
fill with `canvas` (dark) text. Secondary = `border border-ink`, ink text on `surface`.

**Status bar:** light content (`StatusBar style="light"` in `app/_layout.tsx`) — the ground is dark.

---

## 6. Materials — structure over shadow

Surfaces are separated by **hairline `divider` borders** over the `canvas` ground (dark-on-light in
light mode, light-on-dark in dark), not by drop shadows.

- **Cards / surfaces:** `1px solid divider` border, flat on `canvas`. **No card shadow.** The
  `surface`/`canvas` contrast + the hairline border do the separating.
- **Structural rules:** hairline `divider` (rows, under-wordmark) and `crumb` (stronger section rules).
  Visible on purpose.
- **The primary action ("New note" pill) is the ONLY element with a real shadow.** The `ink` pill
  also pops by sheer contrast:

| Element | shadowOpacity | shadowRadius | elevation (Android) |
|---|---|---|---|
| Primary action pill | 0.22 | 12 | 8 |
| Everything else | — (border-first) | — | 0 |

> Do not reintroduce card shadows to make surfaces "pop". Lifted tone + light borders do that now.

---

## 7. Icons

Use `lucide-react-native` exclusively. No mixing icon sets.

- Default size 20px, stroke width 1.5.
- Colour: `ink` for active/primary chrome; `icon` (`#8A919C`) for passive/secondary.
  On an `ink` fill (e.g. the pill), icons use `canvas`.
- Outline only, never filled. Never coloured to draw attention — icons are structural.

```tsx
import { Plus } from 'lucide-react-native'
import { useThemeColors } from '@/theme/ThemeProvider'
const colors = useThemeColors()
<Plus size={20} color={colors.canvas} strokeWidth={1.5} /> // on the ink pill
```

---

## 8. Motion and feedback

Calm and deliberate — with exactly **one signature move**.

- **Signature:** the "New note" pill springs on press (scale ~0.96 and back). Snappy, not bouncy.
- List/scroll: native behaviour. Screen transitions: default Expo Router stack.
- Loaded content: 150ms opacity fade when data arrives.
- **No skeleton loaders** — show nothing until ready, then fade in. `ActivityIndicator` (in `ink`,
  or `canvas` when on an `ink` fill) is fine for genuine async waits.
- Haptics: light impact on note creation. No confetti — the content IS the feedback.

---

## 9. Empty states

No illustrations, no emoji, no graphics. Give them **voice** using the display face: one confident
line in **Space Grotesk** (`heading-sm`/`ink`), optionally a quiet second line in `empty-faint`.
Centred. e.g. "Nothing here yet." over "Tap New note to begin." Authored, not a default.

---

## 10. Theming (light & dark)

**Both ship.** Light = Direction C ("Stone"), Dark = Direction B ("Graphite"). The user chooses
**System / Light / Dark** in Account (`useTheme().setPref`); the choice persists (`lib/themeStore.ts`)
and 'system' follows the device. Mechanism:

- `theme/colors.ts` holds `lightColors` / `darkColors` (same keys) and their CSS-variable maps.
- `theme/ThemeProvider.tsx` applies a `vars()` style for the resolved scheme to the root, so every
  `className` colour (`text-ink`, `bg-canvas`, …) themes automatically; it also exposes
  `useThemeColors()` for runtime values (StyleSheet, `color=` props, WebView CSS).
- **Never** import a fixed palette for a themed value, and never use a `dark:`/`light:` className
  variant — the token already switches. WebViews are isolated documents, so they inject a `:root`
  var block built from the active palette (`getTiptapEditorHtml`, `MarkdownRenderer`).

To change a colour, edit `theme/colors.ts` (both themes) — nothing else.

---

## 11. What to avoid

| What | Why it's wrong for Slate |
|---|---|
| Hardcoded hex in components | The whole point of §2 — always use a token (themed) |
| A `dark:`/`light:` className variant | Tokens already switch per scheme (§10) — variants double-theme |
| Importing a fixed palette for a themed value | Use `useThemeColors()` — a fixed import breaks the other mode |
| Warm / beige greys | The ground is cool in both themes — stone in light, graphite in dark |
| A muddy low-contrast theme | Both themes are high-contrast (near-black↔stone, off-white↔graphite) |
| Whisper card shadows | Materials are border-first (§6) — hairlines separate, not shadows |
| A floating Material FAB circle | The primary action is the `ink` "New note" pill (§5) |
| The wrong text colour on the `ink` pill | On an `ink` fill, text/icons are `canvas` — use `inverted` |
| System-serif wordmark | The wordmark is Space Grotesk — never a system fallback |
| Coloured icons / gradients / badges | Breaks the monochrome, structural system |
| Emoji in UI text / chevrons on rows | Breaks the premium tone / navigation is implied |

---

## 12. Screen-level checklist

Before a screen is done:

- [ ] Background is `bg-canvas` (cool — stone in light, graphite in dark); colours are tokens (themed)
- [ ] Horizontal padding is 18px (`H_PAD`); web content capped at 680px, centred
- [ ] High contrast: `ink` type reads crisply on `canvas` in BOTH themes (check both)
- [ ] Display roles use **Space Grotesk**; read/UI roles use **Geist** — not mixed up
- [ ] Type uses deliberate scale contrast, not a flat 13–16 band
- [ ] Section labels use the wide-tracked ALL-CAPS 12px label style
- [ ] **No hardcoded hex — every colour is a token from §2**
- [ ] Surfaces are **bordered** (`border border-divider`, `rounded-xl`), not shadowed (§6)
- [ ] The primary action (if present) is the near-white "New note" pill with `canvas` label
- [ ] Text/icons on an `ink` fill use `canvas` (dark) — via `inverted` or `colors.canvas`
- [ ] Icons are Lucide, size 20, stroke 1.5, `ink` (active) or `icon` (passive)
