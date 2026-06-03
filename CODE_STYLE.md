# CODE_STYLE.md — Slate engineering patterns

> Read this before writing any component, hook, or utility function.
> These rules exist so the codebase stays consistent and refactorable as it grows.

---

## 1. Styling — NativeWind first, always

**The rule:** all visual styling uses NativeWind `className` props. No `StyleSheet.create` unless a
platform-specific behaviour (e.g. precise shadow on Android, keyboard avoiding logic) makes it unavoidable.
When you must use StyleSheet, add a comment explaining why.

```tsx
// ✅ correct
<View className="flex-1 bg-background px-6 pt-12">
  <Text className="text-ink font-semibold text-2xl">Hello</Text>
</View>

// ❌ wrong — don't do this
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#FAFAF8' } })
<View style={styles.container}>
```

**Never hardcode hex values in className or style props.** Use the tokens defined in
`tailwind.config.js` → `theme.extend`. If the colour you need isn't in tokens, add it to tokens first,
then use the token name. This is how the entire app stays visually consistent.

```tsx
// ✅ correct — uses token
<Text className="text-ink-muted" />

// ❌ wrong — hardcoded
<Text style={{ color: '#888888' }} />
```

---

## 2. Component architecture — build primitives first

Every screen is assembled from small, reusable primitives. Before building a new screen component,
check `components/ui/` first. If the primitive you need doesn't exist, create it there before using it.

**The primitive set (build these in order as needed):**

| File | What it renders | Key props |
|---|---|---|
| `components/ui/Text.tsx` | All text in the app | `variant` (`heading` / `body` / `caption` / `label`), `muted` |
| `components/ui/Button.tsx` | All tappable buttons | `variant` (`primary` / `ghost` / `danger`), `size` (`sm` / `md`) |
| `components/ui/Input.tsx` | Text inputs | `label`, `error`, `multiline` |
| `components/ui/Card.tsx` | Elevated surface | `onPress`, `noPad` |
| `components/ui/Divider.tsx` | Horizontal rule | — |
| `components/ui/IconButton.tsx` | Icon-only tap target | `icon`, `size`, `onPress` |

**Rule:** screen files (`app/(app)/index.tsx` etc.) should contain almost no styling. They compose
primitives. The primitives own the styling decisions.

```tsx
// ✅ screen file — clean composition
export default function HomeScreen() {
  return (
    <View className="flex-1 bg-background">
      <Text variant="heading">Hello, Aryan</Text>
      <NoteCard title="Sprint Retro" preview="..." onPress={...} />
    </View>
  )
}

// ❌ screen file with inline styling noise
export default function HomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8', paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A' }}>Hello, Aryan</Text>
```

---

## 3. Reusable styles — the `cn` utility and class groups

For combinations of classes that appear more than twice in the codebase, extract them to a named
constant in `theme/classGroups.ts`, not inline. This prevents drift where the same visual element
gets slightly different classes across files.

```ts
// theme/classGroups.ts
export const sectionLabel = 'text-xs font-medium tracking-widest uppercase text-ink-muted'
export const screenPadding = 'px-6'
export const cardSurface = 'bg-white rounded-2xl'
```

```tsx
// usage
import { sectionLabel, screenPadding } from '@/theme/classGroups'
<Text className={sectionLabel}>Folders</Text>
```

Use the `cn()` utility (from `clsx` / `tailwind-merge`) for conditional class merging:

```tsx
import { cn } from '@/lib/cn'

<Text className={cn('text-ink', muted && 'text-ink-muted', className)} />
```

---

## 4. Hooks — data stays in hooks, components stay dumb

Every piece of server state lives in a hook. The rule from `AGENTS.md` section 3 applies to every
file: **no component calls `supabase.from(...)` directly, ever.**

Hook naming convention:
- `useProfile` — signed-in user's profile row
- `useFiles(folderId?)` — files list, optionally filtered by folder
- `useFolders` — folder list for the current user
- `useFile(id)` — single file, with realtime subscription
- `useFileSync(id)` — open-editor sync, presence, soft lock

Hooks return a consistent shape:

```ts
// all hooks return this pattern
return {
  data,           // the actual data (typed, never `any`)
  isLoading,      // boolean
  error,          // Error | null
  refetch,        // () => void — only if manual refresh is needed
}
```

---

## 5. TypeScript discipline

- All DB types come from `types/db.ts` — keep this in sync with the Supabase schema.
- All component props have explicit interfaces — no implicit `{}` prop types.
- Prefer `type` over `interface` for prop shapes (simpler, composable).
- Use `satisfies` when constructing config objects against a known type.
- No `as` casting unless you can explain in a comment why it's safe.

```ts
// ✅ explicit prop type
type NoteCardProps = {
  title: string
  preview: string
  updatedAt: Date
  onPress: () => void
}

// ❌ implicit / lazy
const NoteCard = ({ title, preview, onPress }: any) => {
```

---

## 6. File and folder naming

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `NoteCard.tsx` |
| Hooks | camelCase with `use` prefix | `useFiles.ts` |
| Utility functions | camelCase | `formatDate.ts` |
| Route files | lowercase, Expo Router convention | `index.tsx`, `[id].tsx` |
| Type files | camelCase | `db.ts` |
| Style constants | camelCase | `classGroups.ts` |

---

## 7. Avoid these patterns

| Pattern | Why | Instead |
|---|---|---|
| `StyleSheet.create` for visual styling | Bypasses NativeWind token system | `className` with tokens |
| Hardcoded colours / spacing | Can't be changed globally | Token names in `tailwind.config.js` |
| Direct `supabase.from()` in components | Breaks hook isolation | Custom hook |
| Deeply nested ternary JSX | Unreadable | Extract to a helper component |
| `console.log` left in committed code | Noise | Remove before committing |
| Prop drilling more than 2 levels | Hard to maintain | Context or hook at the right level |