# VISUAL_STYLE.md — Slate visual language

> Read this before writing any component a user will see. Every UI decision in Slate is
> checked against this file. If a value isn't defined here, ask before inventing one.
>
> **This file is the single source of truth for colour, type, and spacing.** The Tailwind
> config mirrors it exactly. If you find a hardcoded hex in a component that isn't a token
> below, that is a bug — replace it with the token.

---

## The aesthetic in one sentence

**Slate feels like a piece of cold-pressed slate — black ink on a cool grey ground, nothing
decorative, everything intentional. Meditative. Unhurried. Expensive without showing off.**

The ground is deliberately *cool*, not warm. The product is called Slate; the surface should
read like stone and cold light, not like paper. This is the defining decision of the palette —
every grey leans slightly cool, never warm/beige.

---

## 1. The mood board (mental reference points)

When making a UI decision, ask: does this feel like one of these?

- A slab of honed slate — cool grey, matte, flat
- An Arc'teryx tag — minimal type, confident spacing, monochrome
- A luxury editorial magazine in greyscale — stark contrast, generous white space
- Notion's calm — but cooler, quieter, more human

It does **not** feel like:
- A productivity dashboard (no colour-coded labels, no progress rings)
- A social app (no avatars everywhere, no engagement metrics)
- A Material Design app (no coloured primary buttons, no chunky elevation shadows)
- Warm/beige stationery (the ground is cool grey, not cream)

---

## 2. Colour palette — the one true list

The entire app is monochrome on a cool-grey axis. These are the **only** colours. Every value
here is what ships in the app today — the Tailwind config must match these exactly.

| Token name | Hex | Use |
|---|---|---|
| `ink` | `#1A1A1A` | Primary text, wordmark, icons, active elements, FAB & profile bg |
| `ink-muted` | `#9E9890` | Card/list preview text, metadata, secondary content |
| `ink-subtle` | `#6B6B6B` | Sign-in subtitle, the quietest readable text |
| `canvas` | `#F0F1F4` | App screen background — cool off-grey, never white, never warm |
| `surface` | `#FFFFFF` | Cards, note containers, folder chips, modals, inputs |
| `surface-raised` | `#FAFAF8` | Hover/pressed surface states |
| `divider` | `#E8E8E6` | Hairline dividers between list rows |
| `crumb` | `#D4D4D2` | Breadcrumb `›` separators, the faintest structural line |
| `search-bg` | `#E6E7EA` | Search bar container tint (cool, sits between canvas and divider) |
| `placeholder` | `#B4B6BB` | Search icon + placeholder text |
| `empty-faint` | `#C8C8C6` | Secondary line in empty states |

```js
// tailwind.config.js → theme.extend.colors — MUST match the table above exactly
colors: {
  ink: '#1A1A1A',
  'ink-muted': '#9E9890',
  'ink-subtle': '#6B6B6B',
  canvas: '#F0F1F4',
  surface: '#FFFFFF',
  'surface-raised': '#FAFAF8',
  divider: '#E8E8E6',
  crumb: '#D4D4D2',
  'search-bg': '#E6E7EA',
  placeholder: '#B4B6BB',
  'empty-faint': '#C8C8C6',
}
```

> **Migration note:** the old config had unused/drifted tokens (`paper`, `slate-100/200/400/600`,
> a warm `canvas`). Delete them. The table above replaces the entire colour section. Any
> component still using a deleted token name or a raw hex must be updated to a token above.

**Accent colour: none.** No blue, no green, no brand colour. Interactive elements are black.
Links are underlined black text. The active/selected state is a black fill with white text.
The one permitted non-monochrome value is a system red for destructive text (see §5).

---

## 3. Typography

One typeface family, a small number of sizes, never decorative. Negative letter-spacing on
headings is part of the identity — it gives the tight, editorial feel.

**Wordmark font:** `Georgia` (iOS) / `serif` (Android) for the "Slate" wordmark only.
**UI font:** `DMSans` (Expo Google Fonts) for everything else; falls back to system sans.

| Role | Size | Weight | Colour | Special |
|---|---|---|---|---|
| App wordmark "Slate" | 38px | 700 | `ink` | serif, letter-spacing −1.2 |
| Screen / page title | 30px | 700 | `ink` | letter-spacing −0.8 |
| Section heading | 20px | 600 | `ink` | letter-spacing −0.4 |
| Card / list title | 15px | 600 | `ink` | letter-spacing −0.2 |
| Body text | 15px | 400 | `ink` | leading-relaxed |
| Preview text | 13px | 400 | `ink-muted` | lineHeight 18–19, clamp lines |
| Caption / meta | 13px | 400 | `ink-muted` | — |
| Section label | 11px | 500 | `ink-muted` | ALL CAPS, letter-spacing 0.7 |
| Sign-in subtitle | 15px | 400 | `ink-subtle` | — |

**Rules:**
- Never more than two type sizes competing on one screen.
- Section labels (FOLDERS, NOTES) are always the all-caps label style — never body weight.
- Titles are semibold (600). Never bold (700) except the wordmark and page title. Never regular.
- No italic in the UI (only inside markdown editor content).
- Headings `leading-snug`; body `leading-relaxed`.

---

## 4. Spacing and layout

Generous and unhurried. More space = more premium. These values are what ships today.

| Token | Value | Use |
|---|---|---|
| Screen horizontal padding | 18px (`px-[18px]`, `H_PAD`) | Every screen's left/right edge |
| Web max-width | 680px, centered | Screens don't stretch on desktop |
| Section gap | 30px (`mt-[30px]`) | Between major sections (Folders → Notes) |
| Grid gap | 10px | Between folder chip columns/rows |
| Card internal padding | 16px (`p-4`) | Inside NoteCard / FolderCard |
| List item padding | 14px vertical, 16px horizontal | Inside NoteListItem rows |
| Bottom scroll padding | 120px | Clears the FAB |
| Icon size | 20px | Inline icons, navigation |
| FAB size | 56px (radius 28) | Floating action button |
| Profile button | 36px (radius 18) | Header avatar |

**Border radii**

| Element | Radius |
|---|---|
| FAB | 28px (circular on 56×56) |
| Profile button | 18px (circular on 36×36) |
| Cards (NoteCard, FolderCard) | 16px (`rounded-2xl`) |
| Note list container | 16px |
| FolderChip | 14px |
| Search bar | 16px (`rounded-2xl`) |
| Sign-in button | 12px (`rounded-xl`) |

**The grouped-card pattern:** a list of items (notes in a folder) lives inside ONE shared
`surface` card with `rounded-2xl` corners. Rows are separated by a `hairlineWidth` `divider`
line, inset 16px from the left — **no gap between rows**. The card floats on `canvas`.

```tsx
// ✅ correct — one card, divider rows
<View className="bg-surface rounded-2xl overflow-hidden">
  <NoteListItem title="Team Intro Doc" preview="…" />
  <View className="bg-divider ml-4" style={{ height: StyleSheet.hairlineWidth }} />
  <NoteListItem title="Sprint Retrospective" preview="…" />
</View>

// ❌ wrong — separate cards with gaps between them
<NoteListItem className="bg-surface rounded-2xl mb-3" … />
<NoteListItem className="bg-surface rounded-2xl mb-3" … />
```

---

## 5. Interactive elements

**Primary action (FAB):**
- Black circle (`bg-ink rounded-full`), white icon, 56×56.
- One per screen maximum. Position: 24px from bottom, 24px from right.

**Buttons:**
> Button system, input styles, and press states are intentionally undefined in v1.
> They will be specified iteratively as screens are built. Do not invent a system —
> ask the human when a new button or interactive pattern is needed for the first time.

**Tappable rows (notes, folders):**
- No visible tap indicator at rest, no chevrons — navigation is implied.
- On press: `activeOpacity` 0.65 for list items, 0.88 for cards/chips — a clean fade, no ripple.

**Input fields:**
- Bottom border only (`border-b border-divider`) at rest; becomes `border-ink` on focus.
- Placeholder in `placeholder` colour. Static label above the field — no floating labels.

---

## 6. Shadows / elevation

Slate uses **very subtle** shadows — present but barely perceptible. The FAB is the most
elevated element; everything else is a whisper. All shadows use `shadowColor: '#000'`.

| Element | shadowOpacity | shadowRadius | elevation (Android) |
|---|---|---|---|
| FAB | 0.22 | 10 | 8 |
| NoteCard | 0.09 | 8 | 3 |
| Note list container | 0.07 | 10 | 2 |
| FolderChip | 0.07 | 6 | 2 |

> These are intentionally low. Do not increase opacity to make cards "pop" — that breaks the
> flat, matte slate feel. If a surface needs to read as separate, it's the `canvas`/`surface`
> contrast doing the work, not the shadow.

---

## 7. Icons

Use `lucide-react-native` exclusively. No mixing icon sets.

- Default size 20px, colour `ink` (#1A1A1A), stroke width 1.5 (Lucide default — don't change).
- Outline only, never filled. Never coloured to draw attention — icons are structural, not decorative.

```tsx
import { Folder, FileText, Plus, ChevronRight } from 'lucide-react-native'
<Folder size={20} color="#1A1A1A" />
```

---

## 8. Motion and feedback

Slow and deliberate. No bouncy animation.

- List/scroll: native `FlatList` behaviour, no override.
- Screen transitions: default Expo Router stack (slide in from right).
- Loaded content: 150ms opacity fade when data arrives (prevents flash).
- **No skeleton loaders** — show nothing until ready, then fade in.
- Haptics: light impact on note creation (`Haptics.impactAsync(ImpactFeedbackStyle.Light)`).
- No confetti, no success animations — the content IS the feedback.

---

## 9. Empty states

No illustrations, no emoji, no graphics. A short line of `ink-muted` text, optionally a second
line of `empty-faint`, centred on screen. Example: "No notes yet." / "Tap + to create one."
The blankness is intentional and on-brand.

---

## 10. Dark mode

**Post-MVP.** Do not add `dark:` variants in v1. A cool-grey dark palette will be defined here
when it ships; until then every screen is light-mode only.

---

## 11. What to avoid

| What | Why it's wrong for Slate |
|---|---|
| Hardcoded hex in components | The whole point of §2 — always use a token |
| Warm/beige greys | The ground is cool slate, not paper |
| Strong drop shadows | Looks like Material Design; breaks the matte feel |
| Coloured folder icons / tags | Breaks the monochrome system |
| Gradient backgrounds | Looks like a fintech app |
| Standalone rounded-rectangle buttons | Use pill or full-width block |
| Emoji in UI text | Breaks the premium, editorial tone |
| Progress bars / streaks / badges | Gamification kills the meditative feel |
| Large avatar photos | This is a notes app, not a social app |
| Chevrons on list rows | Navigation is implied; chevrons add noise |

---

## 12. Screen-level checklist

Before a screen is done:

- [ ] Background is `bg-canvas` (#F0F1F4) — cool grey, not white, not warm
- [ ] Horizontal padding is 18px (`H_PAD`) on all content
- [ ] Web content is capped at 680px and centred
- [ ] Section labels use the all-caps 11px label style
- [ ] All text uses only the type scale in §3
- [ ] **No hardcoded hex anywhere — every colour is a token from §2**
- [ ] Cards use `rounded-2xl` and group their rows with hairline dividers
- [ ] Shadows match the §6 table — not heavier
- [ ] The FAB (if present) is the only primary action on the page
- [ ] Icons are Lucide, size 20, stroke 1.5, `ink` colour