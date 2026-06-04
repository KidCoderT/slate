# LIVE_EDITING.md — Slate turn-based live editing (Milestone B) + future Yjs upgrade

> **Status:** NOT YET BUILT. This is the executable spec for the session *after* Milestone A
> (real file create/edit/autosave on Supabase) is shipped and tested. It is kept in the repo so
> the design does not have to be re-derived. Read `AGENTS.md`, `DESIGN.md`, `CODE_STYLE.md`, and
> `APP_AESTHETIC.md` before executing.

---

## The settled decision (why this exists)

Slate v1 ships **walkie-talkie / turn-based editing**, NOT Google-Docs simultaneous co-typing:
one person edits at a time; others watch the edits stream in live and tap **"request to edit"**
to take over the pen. This was chosen deliberately:

- It matches DESIGN.md's own roadmap order (§6.2 lists *live presence* ahead of *simultaneous
  CRDT editing*) and the "meditative, unhurried, nothing unnecessary" brand.
- It is far simpler and cheaper: **Supabase Broadcast + Presence only — no Yjs, no extra server,
  no Yjs inside the native WebView.**
- Because all sync lives in **one hook (`useFileSync`)** and the `yjs_state bytea` column already
  exists, upgrading to true simultaneous editing later is a **bounded one-hook change with no SQL
  migration and no data loss** (seed a Y.Doc from the stored HTML on first collaborative open).

We deliberately built **no optimistic-lock merge-prompt UI** — with one writer at a time there is
nothing to merge.

> **Doc deviation recorded:** DESIGN.md §6.2 originally framed real-time editing as post-MVP and
> v1 as solo + optimistic-lock conflict prompt. v1 actually ships *turn-based live editing*
> (between the doc's "Level 2" and "Level 3"), dropping the merge-prompt. DESIGN.md §6.2/§13 and
> AGENTS.md should already reflect this after Milestone A.

---

## Prerequisite (must be true before starting)

Milestone A is complete: `hooks/useFileSync.ts` loads a note and autosaves it (HTML +
`version`/`updated_at`/`updated_by`), `hooks/useFiles.ts` lists/creates/deletes, and the note
screen + home are wired to real Supabase data with nothing faked except the lock/presence UI
(which is dormant, `canEdit = true` for the owner).

## Where everything lands

Entirely **inside `useFileSync` + the `useFiles` subscription**. No editor or screen-layout
changes. The UI affordances — lock states (`free`/`me`/`other`), edit-request banner, presence
avatars + bottom pill — already exist in `app/(app)/note/[id].tsx`; they just get wired to real
signals instead of local stubs.

`useFileSync(id)` grows (additively) to return:

```ts
useFileSync(id) => {
  // …Milestone A: file, isLoading, error, title, setTitle, content, setContent, saveStatus
  lockState,        // { status: 'free' } | { status: 'me' } | { status: 'other'; who: string }
  acquire,          // () => void  — claim the pen (only if free)
  release,          // () => void  — drop the pen
  requestEdit,      // () => void  — viewer asks the writer to hand over
  presenceUsers,    // { id, displayName, color, editing }[]  — drives avatars + "N viewing"
  isLive,           // boolean — channel subscribed
}
```

## Mechanism

- **Channel per note:** `supabase.channel(\`note:${id}\`, { config: { presence: { key: userId } } })`
  using **Presence + Broadcast**. Subscribe on mount, `removeChannel` on unmount.
- **Presence = the soft lock.** Each client tracks `{ userId, displayName, color, editing }`.
  Derive `lockState` from the presence state: another client with `editing:true` → `other`
  (with their `displayName`); my own `editing:true` → `me`; nobody editing → `free`. Presence is
  ephemeral — it auto-clears when a client disconnects (tab/app close, network drop), so there is
  **no stale-lock cleanup** (DESIGN §13).
- **acquire()** sets my presence `editing:true` **only if no one else currently holds it**
  (guard against the race by re-reading presence state first). **release()** sets `editing:false`.
- **Live mirror.** While I hold the pen, broadcast my editor `content` (throttled HTML, ~150–250ms)
  on a `broadcast` event (e.g. `{ event: 'content' }`). Viewers apply it through the editor's
  existing `setContent` path and render **read-only** (`editable=false`). One writer ⇒ no merge.
- **Request / hand-over.** A viewer's `requestEdit()` broadcasts `edit-request` → the writer sees
  the existing banner → **"Hand over"** calls `release()` → the requester can now `acquire()`.
  The pen-holder stays the **sole DB writer** (reuses Milestone A's autosave; viewers never write).
- **The file stays readable by everyone at all times** — the lock only signals "don't start a
  competing edit," it never blocks viewing.

## Realtime auth

Supabase Realtime must carry the Clerk identity. After obtaining the token, call
`supabase.realtime.setAuth(clerkToken)` (wire into `lib/supabase.ts` / the hook). For now key the
channel by file id — anyone who can open the note already has the id. **Tighten to
RLS-authorized private channels when the sharing phase lands.**

## List realtime (home + folder lists update live)

Add a `postgres_changes` subscription on the `files` table to `useFiles` so newly created /
edited / deleted notes appear without a manual refetch. This requires the table to be in the
realtime publication:

```sql
-- supabase/migrations/0002_realtime.sql
alter publication supabase_realtime add table files;
```

(Replaces Milestone A's fetch-on-focus fallback.)

## Testing caveat

Real two-person walkie-talkie needs **sharing** (another user able to open the same note), which
is a later phase. Until sharing ships, verify with the **owner in two browser tabs / two devices**
— both satisfy owner-only RLS, which is enough to prove presence, soft lock, live mirror, and
hand-over. Acceptance:

- Tab A opens the note and acquires the pen; tab B goes read-only and shows "… is editing".
- Keystrokes in A mirror into B live.
- B taps **request to edit** → A's banner appears → A taps **hand over** → pen transfers to B.
- Closing the writer tab **auto-frees** the lock (presence ephemerality) — B can then acquire.

---

## Future — true simultaneous editing (Yjs), only when explicitly wanted

When (and only when) Google-Docs-style simultaneous co-typing becomes a goal, **swap the internals
of `useFileSync` only**:

- Add `yjs` + `@tiptap/extension-collaboration` + the y-tiptap binding.
- Set StarterKit `undoRedo: false` (required — Collaboration brings its own history; the default
  undo/redo conflicts with Yjs).
- **Seed a `Y.Doc` from the stored `content` HTML on first collaborative open** (existing notes
  have no `yjs_state`). No SQL migration — `yjs_state bytea` already exists.
- Persist the merged `Y.Doc` to `yjs_state` (debounced) and **keep deriving `content` HTML** for
  previews / search / the public viewer / `.md` export.
- **Transport:** a small DIY Supabase-Broadcast Yjs provider to preserve the $0 cost model (the
  community `y-supabase` package is self-labelled *not production-ready*; a hosted
  Hocuspocus/`y-websocket` server would break DESIGN §9's free-tier runway).
- **Native:** load Yjs inside the WebView and bridge encoded update-bytes across the
  RN ↔ WebView `postMessage` boundary (keep the Supabase client in the hook, not the WebView).

**Unchanged by this upgrade:** both editor components, `tiptapEditorHtml.ts`, the note screen,
the presence UI, and the database schema.

## Files touched (Milestone B)

- **Modify:** `hooks/useFileSync.ts` (presence/broadcast/lock/mirror), `hooks/useFiles.ts`
  (postgres_changes subscription), `lib/supabase.ts` (`realtime.setAuth`).
- **Add:** `supabase/migrations/0002_realtime.sql`.
- **Reuse unchanged:** `app/(app)/note/[id].tsx` UI, both editor components, `tiptapEditorHtml.ts`.
