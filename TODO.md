# Slate — Implementation TODOs

> These are features that are **designed but not yet built**. Each section describes exactly how to implement it when the time comes — no guesswork needed.

---

## 1. Share button — full implementation

**Current state:** `ShareSheet.tsx` is a working UI shell backed by dummy data. The `Send` button and `Copy link` button are stubs.

### What needs to be built

#### `hooks/useShares.ts`
All share mutations go through this hook. No component ever touches the `shares` table directly.

```ts
type UseSharesReturn = {
  shares:            Share[]
  isLoading:         boolean
  addShare:          (email: string, permission: 'view' | 'edit') => Promise<void>
  updatePermission:  (shareId: string, permission: 'view' | 'edit') => Promise<void>
  revokeShare:       (shareId: string) => Promise<void>
  setPublicLink:     (on: boolean) => Promise<void>
  publicUrl:         string | null
}
```

- **`addShare`** — insert into `shares` (resource_type, resource_id, owner_id, invited_email, permission). Then call the Edge Function to send an email invite (see below).
- **`updatePermission`** — `UPDATE shares SET permission = $1 WHERE id = $2 AND owner_id = $3`
- **`revokeShare`** — `DELETE FROM shares WHERE id = $1 AND owner_id = $2`
- **`setPublicLink`** — toggle `files.is_public` + generate/clear `files.public_slug`. Use `nanoid(8)` for the slug. When `0002_visibility.sql` is applied, update `files.visibility` instead.
- Subscribe to `shares` via Supabase Realtime so the sheet updates live when another client revokes a share.

#### Email invite — Supabase Edge Function
Create `supabase/functions/send-share-invite/index.ts`.

- Triggered by the client after inserting a share row (call directly from `addShare`, don't rely on a DB webhook to avoid Supabase free-tier limitations).
- Sends a formatted email: "Sunil Tejas shared _Note Title_ with you" with a link.
- The link is either the note's public URL (`/s/{slug}`) if public, or a deep link that requires the recipient to sign in.
- Use Supabase's built-in Resend integration or the `RESEND_API_KEY` env var.

#### `expo-clipboard` for copy link
```
bun add expo-clipboard
```
In `ShareSheet.tsx`, replace the `console.log` TODO:
```ts
import * as Clipboard from 'expo-clipboard'
// ...
await Clipboard.setStringAsync(`https://slate.app/s/${publicSlug}`)
```

#### Folder shares
The `useShares` hook works identically for folders — just pass `resource_type: 'folder'` and `resource_id: folderId`. A folder share grants access to all **current and future** files within that folder. This is enforced at the RLS policy level (TODO in `0001_init.sql` — `-- TODO: folder share inheritance`).

---

## 2. Presence — multiple viewers in real time

**Current state:** `PresenceAvatars` shows three hardcoded dummy users. The "Maya is editing" pill is a local boolean.

### Architecture

All presence logic lives in `hooks/useFileSync.ts`. No component sets up a Supabase channel directly.

```ts
type PresenceUser = {
  userId:      string
  displayName: string
  avatarUrl:   string | null
  isEditing:   boolean
}

type UseFileSyncReturn = {
  content:       string
  setContent:    (html: string) => void
  presenceUsers: PresenceUser[]   // everyone currently viewing this note
  lockOwner:     PresenceUser | null  // whoever has the pen (isEditing: true)
  acquireLock:   () => Promise<void>
  releaseLock:   () => Promise<void>
}
```

### Implementation

```ts
// hooks/useFileSync.ts (skeleton)
export function useFileSync(fileId: string): UseFileSyncReturn {
  const { user } = useAuth()  // Clerk
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const channel = supabase.channel(`file:${fileId}`, {
      config: { presence: { key: user.id } }
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>()
      setPresenceUsers(Object.values(state).flat())
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId:      user.id,
          displayName: user.fullName ?? user.emailAddresses[0].emailAddress,
          avatarUrl:   user.imageUrl ?? null,
          isEditing:   false,
        })
      }
    })

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [fileId, user.id])

  async function acquireLock() {
    await channelRef.current?.track({ isEditing: true })
  }

  async function releaseLock() {
    await channelRef.current?.track({ isEditing: false })
  }

  // ...content save logic (debounced DB write)
}
```

### Wiring into the note screen
Replace the dummy `isMeEditing` / `isOtherEditing` state in `note/[id].tsx` with:

```ts
const { presenceUsers, lockOwner, acquireLock, releaseLock } = useFileSync(file.id)
const canEdit = lockOwner?.userId === user.id
const isOtherEditing = lockOwner !== null && lockOwner.userId !== user.id
```

`PresenceAvatars` receives:
```ts
const viewers = presenceUsers.map(u => ({
  id:      u.userId,
  initial: u.displayName[0].toUpperCase(),
  color:   hashToColor(u.userId),  // deterministic color from ID
}))
```

---

## 3. Walkie-talkie lock → full real-time collab upgrade

**Current:** Local `isMeEditing` boolean. Lock is fake.
**Level 2 (next):** Supabase Presence (see §2 above). One writer at a time.
**Level 3 (post-MVP):** Yjs CRDT — multiple concurrent writers, no lock needed.

### The upgrade contract

`useFileSync` is the **only** thing that changes between Level 2 and Level 3. Every component, screen, and hook consumer stays identical.

**Level 2 return shape:**
```ts
{ content, setContent, presenceUsers, lockOwner, acquireLock, releaseLock }
```

**Level 3 return shape (same interface):**
```ts
{
  content,        // backed by Yjs Y.Text
  setContent,     // writes to the Yjs doc, syncs via Broadcast
  presenceUsers,  // unchanged — same Presence channel
  lockOwner: null,    // always null; CRDT handles conflicts, no lock needed
  acquireLock: noOp,  // no-op
  releaseLock: noOp,  // no-op
}
```

### Level 3 packages
```
bun add yjs @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
```

### Level 3 changes (ONLY in `useFileSync`)
1. Create a `Y.Doc` and attach a Supabase Broadcast provider for sync
2. Persist snapshots to `files.yjs_state` (the `bytea` column already exists — zero migration)
3. Pass `collaboration: { document: ydoc }` to TipTap's `useEditor` / WebView init
4. Remove lock acquire/release logic

**No changes required in:** `note/[id].tsx`, `MarkdownEditorWeb.tsx`, `MarkdownEditorNative.tsx`, `MarkdownToolbar.tsx`, `PresenceAvatars.tsx`, or any other component.

---

## 4. Other TODOs (quick reference)

| Item | Status | Next step |
|---|---|---|
| Markdown export (`.md`) | Not started | `bun add turndown @types/turndown` → `lib/exportNote.ts` |
| HTML export | Not started | Serve `file.content` as `.html` blob download |
| `.md` file import | Not started | File picker → `marked.parse(text)` → `editor.setContent(html)` |
| Public viewer page (`/s/[slug]`) | Route exists (stub) | `usePublicFile(slug)` hook + `MarkdownRenderer` + no auth required |
| `expo-clipboard` for share link | Stub in ShareSheet | `bun add expo-clipboard` + replace `console.log` TODO |
| Offline retry / netinfo | Noted in AGENTS.md §8 | `@react-native-community/netinfo` + reconnect retry in `useProfile` and `useFileSync` |
| `0002_visibility.sql` migration | Designed in DESIGN.md §14 | Replace `is_public boolean` with `visibility enum('private','invited','public')` |
| Supabase cron ping | Not started | GitHub Actions daily ping to prevent free-tier pause |
| Public viewer CSS | Not started | `app/s/[slug].tsx` must match the Slate aesthetic — use `MarkdownRenderer` styles |
