# APP_AESTHETIC.md — Slate visual language (Direction C: "Stone & structure")

> Read this before writing any component a user will see. Every UI decision in Slate is
> checked against this file. If a value isn't defined here, ask before inventing one.
>
> **This file is the single source of truth for colour, type, and spacing.** The Tailwind
> config (`tailwind.config.js`) and `theme/colors.ts` mirror it exactly. If you find a
> hardcoded hex in a component that isn't a token below, that is a bug — replace it with the token.

---

## The aesthetic in one sentence

**Slate is a precise instrument cut from cool stone — structural, confident, quiet. True black
on cool grey, real typographic weight, hairline rules doing the work of decoration. Meditative
but never timid. Expensive because nothing is hedged.**

Two lessons drive this version:
1. **Conviction, not softness.** Luxury-minimal is *high-contrast and spare*, not a wash of
   pale greys. There is a true near-black (`ink #16181D`) and it is used boldly.
2. **Structure, not shadow.** Separation comes from **visible hairline rules and borders**, not
   from barely-there drop shadows. The one genuinely elevated element is the primary action.

The ground stays deliberately *cool*, never warm. The product is called Slate; the surface reads
like honed stone and cold light, not paper.

---

## 1. The mood board (mental reference points)

Does this feel like one of these?

- A slab of honed slate — cool grey, matte, with crisp cut edges
- An Arc'teryx tag — minimal type, confident spacing, monochrome, technical
- Linear / Vercel / Geist — modern software as a precise tool: true black, hairline structure,
  a strong grotesk, generous negative space
- A luxury editorial magazine in greyscale — stark contrast, dramatic type scale, white space

It does **not** feel like:
- A productivity dashboard (no colour-coded labels, no progress rings)
- A social app (no avatars everywhere, no engagement metrics)
- A Material Design app (no floating coloured circles, no chunky elevation shadows)
- Warm/beige stationery, or a soft grey haze with no anchor tone

---

## 2. Colour palette — the one true list

Monochrome on a **cool blue-grey** axis, with a true near-black anchor and **visible** structural
hairlines. These are the only colours. `theme/colors.ts` and the Tailwind config must match exactly.
Token names are retained from v1; values were shifted cooler and higher-contrast for Direction C.

| Token name | Hex | Use |
|---|---|---|
| `ink` | `#16181D` | Primary text, wordmark, icons, active elements — the true-black anchor (FAB fill, active states) |
| `ink-muted` | `#767E8A` | Card/list preview text, metadata, secondary content (cool) |
| `ink-subtle` | `#565D67` | Secondary text, sub-headings — quiet but clearly readable |
| `canvas` | `#E9EBEE` | App screen background — cool stone; deep enough that white surfaces and rules pop |
| `surface` | `#FFFFFF` | Cards, note container, modals, inputs |
| `surface-raised` | `#F4F5F7` | Pressed/raised surface states, code blocks |
| `divider` | `#D7DAE0` | **Structural hairline** — visible, does the separating (rows, borders) |
| `crumb` | `#C2C7CF` | Stronger structural rule; breadcrumb `›` separators; blockquote bar |
| `search-bg` | `#E1E4E9` | Search bar container tint (cool, between canvas and divider) |
| `placeholder` | `#A6ACB6` | Placeholder text + passive icons |
| `empty-faint` | `#B4BAC3` | Secondary line in empty states |
| `icon` | `#8A919C` | Nav/chrome icons, inactive breadcrumb text, non-primary UI chrome |

```js
// tailwind.config.js → theme.extend.colors — MUST match the table above exactly
colors: {
  ink: '#16181D',
  'ink-muted': '#767E8A',
  'ink-subtle': '#565D67',
  canvas: '#E9EBEE',
  surface: '#FFFFFF',
  'surface-raised': '#F4F5F7',
  divider: '#D7DAE0',
  crumb: '#C2C7CF',
  'search-bg': '#E1E4E9',
  placeholder: '#A6ACB6',
  'empty-faint': '#B4BAC3',
  icon: '#8A919C',
}
```

**Accent colour: none.** No blue, no brand colour for chrome, labels, buttons, or decoration.
The active/selected state is an **`ink` (true-black) fill with white text** — used with conviction,
not apologetically.

**On colour in luxury design:** true luxury is the *discipline* of colour, not its absence. A single
green presence dot in a field of cool grey makes the grey feel intentional. Colour earns its place
by being rare and by carrying meaning monochrome cannot.

**Permitted colour uses — each carries semantic meaning, not decoration:**

| Use | Colour | Why |
|---|---|---|
| Saved / synced status dot | `#6BBF94` (`presence`) | Live confirmation — "your work is safe" |
| Active editing presence dot | `#6BBF94` (`presence`) | Live signal — "someone is in here now" |
| Avatar identity circles | Per-user palette (`theme/avatarColors.ts`) | Tell collaborators apart |
| Destructive action / save error | `#D64545` (`danger`) | Warning — cannot be monochrome |

**Everything else is monochrome** — tokens from the table above only. If a colour isn't in this
section, it does not ship.

---

## 3. Typography — two families, real weight

Two typefaces, both free via `@expo-google-fonts`. The pairing IS the identity: a distinctive
grotesk for display and a clean modern grotesk for everything read. **No serif** — the writing
surface is elevated through size, measure, and spacing, not a third face. Negative tracking on
display type is part of the identity.

- **Space Grotesk** (`display`) — wordmark, page titles, section headings, note titles.
  Technical-luxury character; tight tracking.
- **Geist** (`ui`) — body, labels, previews, meta, and the note *writing* body. Modern, powerful,
  legible at every size.

Load both in `app/_layout.tsx` via `useFonts`; gate the splash on load so there is no fallback flash.
Family fallbacks: Space Grotesk → system sans; Geist → system sans.

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

**Rules:**
- Use scale contrast deliberately — a hero title (32) against tiny meta (13) is the editorial move.
  Don't collapse everything into the 13–16 band.
- Section labels (NOTES, SHARED WITH ME) are always the wide-tracked ALL-CAPS label style.
- Display roles (wordmark, page title, section heading, note title) use **Space Grotesk**; every
  read/UI role uses **Geist**. Do not mix them up.
- No italic in the UI chrome (only inside markdown editor content).
- Display type `leading-snug`; reading body line-height 1.6.

---

## 4. Spacing and layout

Generous and unhurried — more space, more premium. Radii are **tighter than v1** for an
architectural, cut-stone feel (less pillowy).

| Token | Value | Use |
|---|---|---|
| Screen horizontal padding | 18px (`px-[18px]`, `H_PAD`) | Every screen's left/right edge |
| Web max-width | 680px, centered | Screens don't stretch on desktop |
| Section gap | 30px (`mt-[30px]`) | Between major sections |
| Card internal padding | 16px (`p-4`) | Inside cards |
| List item padding | 18px vertical, 16px horizontal | Inside NoteListItem rows |
| Bottom scroll padding | 120px | Clears the primary action |
| Icon size | 20px | Inline icons, navigation |
| Primary action ("New note" pill) | auto width × 48 height | Bottom-anchored (see §5) |
| Profile button | 36px (radius 18) | Header avatar |

**Border radii**

| Element | Radius |
|---|---|
| Cards / note-list container | 12px (`rounded-xl`) |
| Inputs / search bar | 12px (`rounded-xl`) |
| "New note" pill | 24px (pill on 48-tall) |
| Profile button | 18px (circular on 36×36) |

**The structural rule motif:** a full-width hairline `divider` rule under the wordmark on home,
and wide-tracked section labels sitting above their content. Rules are the recurring signature —
they replace decoration.

**The grouped-card pattern:** a list of items lives inside ONE shared `surface` card with
`rounded-xl` corners **and a 1px `divider` border** (materials are border-first now — see §6).
Rows are separated by a `hairlineWidth` `divider` line inset 16px from the left — **no gap between
rows**. The card sits on `canvas`.

```tsx
// ✅ correct — one bordered card, divider rows, no shadow
<View className="bg-surface rounded-xl border border-divider overflow-hidden">
  <NoteListItem title="Team Intro Doc" preview="…" />
  <View className="bg-divider ml-4" style={{ height: StyleSheet.hairlineWidth }} />
  <NoteListItem title="Sprint Retrospective" preview="…" />
</View>
```

---

## 5. Interactive elements

**Primary action — the "New note" pill (reinvents the FAB):**
- A bottom-anchored **`ink` (true-black) pill** with a white `Plus` icon + "New note" label in Geist.
  Not a floating Material circle.
- Height 48, pill radius, horizontal padding ~20. Positioned 24px from the bottom, centered or
  right-anchored per screen. One per screen maximum.
- It is the single genuinely elevated element (keeps a real shadow — see §6) and carries the one
  signature micro-interaction: a crisp spring press-scale (§8).

**Tappable rows (notes, folders):**
- No visible tap indicator at rest, no chevrons — navigation is implied.
- On press: `activeOpacity` 0.65 for list rows, 0.88 for cards.

**Input fields:**
- Bottom border only (`border-b border-divider`) at rest; becomes `border-ink` on focus.
- Placeholder in `placeholder` colour. Static label above the field — no floating labels.

**Full-width block actions (sign-in, sign-out):**
- Full-width, `rounded-xl`. Primary = `ink` fill, white text. Secondary = `border border-ink`,
  ink text on `surface`. Confident, not tentative.

---

## 6. Materials — structure over shadow

Direction C separates surfaces with **borders and hairline rules**, not drop shadows. This is the
biggest material change from v1's whisper-shadow look.

- **Cards / surfaces:** `1px solid divider` border, flat on `canvas`. **No card shadow.** The
  border + canvas/surface contrast does the separating.
- **Structural rules:** hairline `divider` (rows, under-wordmark) and `crumb` (stronger section
  rules). Visible on purpose.
- **The primary action ("New note" pill) is the ONLY element with a real shadow** — it is meant to
  float above everything:

| Element | shadowOpacity | shadowRadius | elevation (Android) |
|---|---|---|---|
| Primary action pill | 0.22 | 12 | 8 |
| Everything else | — (border-first) | — | 0 |

> Do not reintroduce whisper card shadows to make surfaces "pop". Borders and contrast do that now.

---

## 7. Icons

Use `lucide-react-native` exclusively. No mixing icon sets.

- Default size 20px, stroke width 1.5 (Lucide default — don't change).
- Colour: `ink` (`#16181D`) for active/primary chrome; `icon` (`#8A919C`) for passive/secondary.
- Outline only, never filled. Never coloured to draw attention — icons are structural.

```tsx
import { Plus } from 'lucide-react-native'
import { colors } from '@/theme/colors'
<Plus size={20} color={colors.ink} strokeWidth={1.5} />
```

---

## 8. Motion and feedback

Calm and deliberate — with exactly **one signature move**.

- **Signature:** the primary "New note" pill springs on press (a quick scale to ~0.96 and back).
  This is the one delightful, fast micro-interaction that signals craft. Keep it snappy, not bouncy.
- List/scroll: native behaviour, no override.
- Screen transitions: default Expo Router stack (slide from right).
- Loaded content: 150ms opacity fade when data arrives.
- **No skeleton loaders** — show nothing until ready, then fade in. `ActivityIndicator` (in `ink`
  or `icon`) is fine for genuine async waits (editor init, fetch on mount).
- Haptics: light impact on note creation.
- No confetti, no success animations — the content IS the feedback.

---

## 9. Empty states

No illustrations, no emoji, no graphics. Give them **voice** using the display face: one confident
line in **Space Grotesk** (`heading-sm`/`ink`), optionally a quiet second line in `empty-faint`.
Centred. Example: a "Nothing here yet." headline over "Tap New note to begin." The blankness is
intentional and on-brand — but it should feel authored, not like a default.

---

## 10. Dark mode

**Post-MVP.** Do not add `dark:` variants in v1. A cool graphite dark palette (the `ink` anchor
already points the way) will be defined here when it ships; until then every screen is light-mode only.

---

## 11. What to avoid

| What | Why it's wrong for Slate |
|---|---|
| Hardcoded hex in components | The whole point of §2 — always use a token |
| Warm/beige greys | The ground is cool stone, not paper |
| A soft grey haze with no anchor | Direction C demands a true-black moment and real contrast |
| Whisper card shadows | Materials are border-first now (§6) — borders separate, not shadows |
| A floating Material FAB circle | The primary action is the "New note" pill (§5) |
| Flat type hierarchy (all 13–16px) | Use dramatic scale contrast — that's the editorial move |
| System-serif wordmark | The wordmark is Space Grotesk — never a system fallback |
| Coloured icons / gradients / badges | Breaks the monochrome, structural system |
| Emoji in UI text | Breaks the premium tone |
| Chevrons on list rows | Navigation is implied; chevrons add noise |

---

## 12. Screen-level checklist

Before a screen is done:

- [ ] Background is `bg-canvas` (#E9EBEE) — cool stone, not white, not warm
- [ ] Horizontal padding is 18px (`H_PAD`); web content capped at 680px, centred
- [ ] There is a real contrast anchor on the page (true-black `ink` used with conviction somewhere)
- [ ] Display roles use **Space Grotesk**; read/UI roles use **Geist** — not mixed up
- [ ] Type uses deliberate scale contrast, not a flat 13–16 band
- [ ] Section labels use the wide-tracked ALL-CAPS 12px label style
- [ ] **No hardcoded hex — every colour is a token from §2**
- [ ] Surfaces are **bordered** (`border border-divider`, `rounded-xl`), not shadowed (§6)
- [ ] The primary action (if present) is the `ink` "New note" pill — the only elevated element
- [ ] Icons are Lucide, size 20, stroke 1.5, `ink` (active) or `icon` (passive)
