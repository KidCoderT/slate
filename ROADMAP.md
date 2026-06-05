# Slate — Roadmap

> The single source of truth for where we've been, where we are, and what ships next.
> Ordered by build stage. Each stage must be done before the next starts.
> Supersedes `TODO.md` (now deleted / archived here).

---

## Stage 1 — Foundation (COMPLETE)

The scaffold: project running, styled, authenticated, and talking to the database.

- [x] Expo + Expo Router + TypeScript project initialised
- [x] NativeWind configured (`tailwind.config.js`, `global.css`, `babel.config.js`, `metro.config.js`)
- [x] Design token palette — 12 monochrome tokens in `theme/tokens.ts` and Tailwind config
- [x] Folder structure from `AGENTS.md §5` in place
- [x] Clerk auth: `ClerkProvider`, secure token cache (`lib/tokenCache.ts`)
- [x] Sign-in screen: Google + email, styled to aesthetic
- [x] Route protection: `(app)` redirects signed-out, `(auth)` redirects signed-in
- [x] Supabase client (`lib/supabase.ts`) wired to Clerk JWT via Third-Party Auth
- [x] `0001_init.sql` migration applied: `profiles`, `folders`, `files`, `shares` tables + owner-only RLS
- [x] `profiles` row auto-created on first sign-in (`claim_pending_shares` + profile upsert in `ProfileContext`)
- [x] Home screen: "Hello, {name}" end-to-end on web and native

---

## Stage 2 — Core Notes App (COMPLETE)

Files you can create, write, and autosave. The basics of the notes experience.

- [x] Home screen: folders chip grid + notes list + FAB (with dummy data initially)
- [x] Folder view: `app/(app)/folder/[id].tsx` — breadcrumb + notes list + FAB
- [x] Note editor: `app/(app)/note/[id].tsx` — TipTap (web) + WebView TipTap (native)
- [x] `MarkdownEditorWeb.tsx` — TipTap editor, formatting shortcuts
- [x] `MarkdownEditorNative.tsx` — WebView TipTap, loading overlay
- [x] `MarkdownToolbar.tsx` — two-row formatting toolbar
- [x] `MarkdownRenderer.tsx` — read-only HTML display
- [x] `useFiles` hook — files list, create (root + folder), realtime sub
- [x] `useFileSync` hook — single open note: load, debounced autosave (700ms), discardIfEmpty
- [x] Files wired to real Supabase (no more dummy data for files)
- [x] `ProfileContext` — single profile load shared app-wide
- [x] Account screen: profile, sign out
- [x] UI primitive set: `Text`, `Button`, `Card`, `Divider`, `FAB`, `ProfileButton`, `SearchBar`, `ScreenContainer`, `Grid`
- [x] `NoteCard`, `NoteListItem`, `FolderCard`, `Breadcrumbs` components

---

## Stage 3 — File Sharing (COMPLETE)

Other people can view and edit notes you own. The core growth loop.

- [x] `0002_sharing.sql` migration applied: sharing RPCs (`grant_file_access`, `find_profile_by_email`, `claim_pending_shares`), widened RLS
- [x] `useShares` hook — owner share management: addShare, removeShare, setPermission
- [x] `useSharedFiles` hook — files shared with me (by other owners)
- [x] `ShareSheet.tsx` — real share modal: email input, permission toggle, revoke, public-link placeholder, animated overlay
- [x] Shared-with-me screen: `app/(app)/shared-with-me.tsx` linked from account
- [x] Email→account resolution: unknown email = pending invite, auto-linked on sign-in via `claim_pending_shares`
- [x] `lib/notify.ts` — share notification stubs (console.log; real delivery later)
- [x] Permission model: `permission: 'owner' | 'edit' | 'view'` derived in `useFileSync`
- [x] Viewer RLS: viewers get read-only — no edit affordances, no share button

---

## Stage 4 — Turn-Based Live Editing / Milestone B (COMPLETE)

One writer at a time. Others watch live. Anyone can request the pen.

- [x] `0003_profile_colour.sql` — `profiles.color` column, per-user palette (run in Supabase)
- [x] `0004_realtime.sql` — `alter publication supabase_realtime add table files` (run in Supabase)
- [x] Per-user colour identity: `theme/avatarColors.ts`, colour picker in Account
- [x] `useFileSync` upgraded: Presence soft-lock, throttled broadcast mirror (200ms), full state machine
- [x] Full hook surface: `acquire`, `release`, `requestEdit`, `acceptRequest`, `declineRequest`, `ignoreRequest`, `pendingRequest`, `requestState`, `presenceUsers`, `lockState`, `isLive`, `isOffline`
- [x] Auto-acquire on open (when free + can-edit); acquire-race tiebreak (smallest userId wins)
- [x] Request → accept handover protocol: flush → release → grant broadcast → grantee acquires
- [x] Viewer gate: `permission === 'view'` can NEVER acquire or request
- [x] Realtime auth: `realtime.setAuth()` on mount + 50s refresh
- [x] `PresenceAvatars.tsx` — live overlapping avatar circles
- [x] State machine edge cases fixed (lockStateRef, editingRef guard, hasSyncedOnce gate, autoAcquiredRef)
- [x] Verified live: two-account testing confirmed

---

## V1 MVP — Required to Ship

Everything below must be done before Slate is ready for real users. In priority order.

### Folder Persistence

Real folder CRUD wired to Supabase. Currently everything folder-related uses `lib/dummyData.ts`.

- [ ] `useFolders` hook — create, rename, delete folders; realtime sub on `folders` table
- [ ] Wire home screen folder grid to real `useFolders` data (remove dummyData dependency)
- [ ] Wire folder view (`folder/[id].tsx`) to real folder + `useFiles(folderId)`
- [ ] Wire note creation from folder view to set real `folder_id` on the created file
- [ ] FAB in folder view creates a file with the correct `folder_id`

### Visibility Migration + Public Links

Replace `is_public boolean` with the `file_visibility` enum (see `DESIGN.md §14`). Required before ShareSheet copy-link can be real.

- [ ] Write and apply `supabase/migrations/0002_visibility.sql`:
  - `create type file_visibility as enum ('private', 'invited', 'public')`
  - Add `visibility file_visibility` column to `files` and `folders`
  - Migrate existing `is_public = true` rows → `visibility = 'public'`
  - Drop `is_public` boolean column
- [ ] Update `types/db.ts` for new column
- [ ] Update `useShares.setPublicLink` — toggle `visibility` + generate/clear `public_slug` using `nanoid(8)`
- [ ] Update ShareSheet public link toggle to call real `setPublicLink`
- [ ] Install `expo-clipboard` (`bun add expo-clipboard`); wire copy-link button in ShareSheet

### Public Viewer

Read-only browser page. No login. This is the growth-loop entry point — it must be flawless.

- [ ] `hooks/usePublicFile.ts` — slug → file lookup, no auth required (public RLS policy)
- [ ] `app/s/[slug].tsx` — public viewer route: renders `MarkdownRenderer` with note content, Slate aesthetic, no edit affordances, no login required
- [ ] Public viewer CSS must match Slate aesthetic (use `MarkdownRenderer` styles)
- [ ] Test on web: unauthenticated browser can open `/s/{slug}` and read the note

### Note Action Modals

Bottom sheets for note management. Routes exist in `DESIGN.md §12` but screens are not built.

- [ ] `app/(app)/(modals)/_layout.tsx` — presents children as bottom sheets
- [ ] `app/(app)/(modals)/note-actions/[id].tsx` — long-press menu: share, move, settings, delete
- [ ] `app/(app)/(modals)/note-settings/[id].tsx` — rename, move to folder, delete
- [ ] `app/(app)/(modals)/move/[id].tsx` — folder picker for "move to folder"
- [ ] Wire long-press on `NoteCard` / `NoteListItem` to open note-actions sheet

### Real Email Invites

Replace the `lib/notify.ts` console.log stubs with actual delivery.

- [ ] Create Supabase Edge Function: `supabase/functions/send-share-invite/index.ts`
  - Triggered directly from `useShares.addShare` (not a DB webhook)
  - Sends: "Sunil Tejas shared _Note Title_ with you" + link
  - Link = `/s/{slug}` if public, or deep link requiring sign-in if private
  - Use Supabase Resend integration or `RESEND_API_KEY` env var
- [ ] Replace `lib/notify.ts` `sendShareEmail` stub with Edge Function call
- [ ] Test: share a file → recipient email received

### Folder Sharing

Share an entire folder. Grants access to all current and future files inside it.

- [ ] Write `supabase/migrations/000N_folder_sharing.sql`:
  - Recursive RLS policy: a share on a folder propagates to all files with `folder_id = that folder`
  - This is the `-- TODO: folder share inheritance` comment in `0002_sharing.sql`
- [ ] Extend `useShares` to support `resource_type: 'folder'`
- [ ] Wire ShareSheet to work for folder routes (pass `type='folder'` and `folderId`)
- [ ] Share button in folder view header

---

## Beta — Real-Device Testing with Multiple People

Before opening Slate to anyone outside development, these must all be working. The goal is: build an Android APK, hand it to testers, have them share notes between real phones, and verify the full sharing loop end-to-end.

### Android Build

- [ ] Set up EAS Build: `bun add -g eas-cli` → `eas login` → `eas build:configure`
- [ ] Add a `preview` profile in `eas.json` that produces a downloadable `.apk` (not AAB) for sideloading:
  ```json
  "preview": {
    "android": { "buildType": "apk" }
  }
  ```
- [ ] Run `eas build --platform android --profile preview` → share the `.apk` download link with testers
- [ ] Confirm app runs and signs in on a real Android device

### Email Sending (CRITICAL — required for beta)

No stubs. Every share must land in the recipient's inbox.

- [ ] Create `supabase/functions/send-share-invite/index.ts`:
  - Called directly from `useShares.addShare` after inserting the share row (not a DB webhook)
  - Sends: "Sunil shared _Note Title_ with you" with a link to `/s/{slug}` (if public) or a sign-in deep link
  - Use `RESEND_API_KEY` env var (set in Supabase Edge Function secrets)
- [ ] Set `RESEND_API_KEY` in Supabase dashboard → Edge Functions → Secrets
- [ ] Replace the `console.log` stub in `lib/notify.ts` `sendShareEmail` with the Edge Function call
- [ ] Test: share a file → real email received on a different phone

### Push Notifications (CRITICAL — required for beta)

Recipients must know something landed in their workspace without having to open the app.

- [ ] `bun add expo-notifications`
- [ ] Add `expo_push_token text` column to `profiles` table (new migration: `000N_push_tokens.sql`)
- [ ] On app start (in `ProfileContext`), request notification permission and upsert the device's Expo push token into `profiles.expo_push_token`
- [ ] In the share Edge Function (or a separate `send-push-notification` function): look up the recipient's `expo_push_token` and send via Expo's push API (`https://exp.host/--/api/v2/push/send`)
- [ ] Notification payload: "Sunil shared a note with you" → taps open the shared note
- [ ] Test: share a note → recipient receives push notification on their real device

### New-Share Unread Indicator

A small dot shows when a shared note hasn't been opened yet. Clears when the recipient opens the note.

- [ ] Add `seen_at timestamptz` column to `shares` (new migration, or include in `000N_push_tokens.sql`)
- [ ] `useSharedFiles` exposes `isNew: boolean` per file (derived from `seen_at IS NULL` on the relevant share row)
- [ ] `NoteCard` gets an `isNew` prop — renders a small filled circle (5×5, `bg-ink`) in the top-right corner of the card when true
- [ ] `ProfileButton` (header avatar) gets a `hasUnread` prop — renders an identical small dot when any unread shared files exist; pass it down from a `useSharedFiles` unread count
- [ ] Mark as seen: when `useFileSync` loads a note that was shared with the current user, call an update to set `seen_at = now()` on that share row
- [ ] Dot disappears on next load after opening

### Beta Testing Checklist

Run through this on at least two real phones (different OS if possible) before calling beta done.

- [ ] Person A shares a note → Person B receives an email
- [ ] Person B taps the email link → opens the note in the app or browser
- [ ] Person B sees the unread dot before opening; dot clears after opening
- [ ] Avatar dot on Person B's header clears once all shared notes are opened
- [ ] Person A and Person B both have the app open → live editing works (presence, request, handover)
- [ ] Person A revokes access → Person B can no longer see the note
- [ ] Push notification arrives on Person B's real device

---

## Post-MVP — Future Features

Not required for V1. Build in rough priority order after launch.

### Collaboration Upgrades

- [ ] Permission revoked mid-session: if owner revokes edit access while B holds the pen, B's client detects and drops to read-only. Re-read `shares` on next presence sync or via `postgres_changes` sub on `shares`
- [ ] Bulletproof handover tiebreak: in `grant` handler, have the grantee win unconditionally regardless of userId sort — prevents targeted handover theft in a sub-50ms tap race
- [ ] Yjs CRDT upgrade (`useFileSync` only): `yjs`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`. `yjs_state bytea` column already exists — zero schema migration. `lockState` becomes always `'free'`; `acquire`/`release` become no-ops

### Import / Export

- [ ] Markdown export (`.md`): `bun add turndown @types/turndown` → `lib/exportNote.ts`
- [ ] HTML export: serve `file.content` as `.html` blob download
- [ ] `.md` file import: file picker → `marked.parse(text)` → `editor.setContent(html)`

### Infrastructure

- [ ] Supabase cron ping: GitHub Actions daily ping to prevent free-tier pause
- [ ] Offline retry / netinfo: `@react-native-community/netinfo` + reconnect retry in `useFileSync`. Queue unsaved writes; flush on reconnect. Show subtle offline indicator
- [ ] `useProfile` reconnect: re-run `syncProfile()` on network reconnect if DB row was not confirmed

### Screens

- [ ] Version history: restore past versions. Requires a new `file_snapshots` table migration (schema in `DESIGN.md §13`)
- [ ] Search: full-text search across all files and folders
- [ ] Folder activity feed: "Ayaan edited intro.md 2 hours ago"

### Polish

- [ ] Light theming alternative (post-MVP — add `dark:` variants and define the cool-grey dark palette in `APP_AESTHETIC.md §10`)

---

## Migrations — Run Status

Track which SQL migrations have been applied to the live Supabase project.

| File | Status | What it does |
|---|---|---|
| `0001_init.sql` | Applied | Tables + owner-only RLS + `requesting_user_id()` |
| `0002_sharing.sql` | Applied | Sharing RPCs + widened files RLS |
| `0003_profile_colour.sql` | **Pending** — run in Supabase | `profiles.color`, backfill, NOT NULL |
| `0004_realtime.sql` | **Pending** — run in Supabase | `alter publication supabase_realtime add table files` |
| `0002_visibility.sql` | **Not written** | Replace `is_public` boolean with `file_visibility` enum |
| `000N_folder_sharing.sql` | **Not written** | Recursive folder-share RLS inheritance |
