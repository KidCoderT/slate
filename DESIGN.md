# Slate — Product Design Document

> **Notes, shared simply.**

_Version 1.0 · Draft · June 2026_

---

## Table of contents

1. [The one-liner](#1-the-one-liner)
2. [Why this matters](#2-why-this-matters-the-problem)
3. [Who it's for](#3-who-its-for)
4. [Design principles](#4-design-principles-the-non-negotiables)
5. [Structure — notes, files, and folders](#5-structure--notes-files-and-folders)
6. [Features](#6-features)
7. [The growth loop](#7-the-growth-loop)
8. [Tech stack](#8-tech-stack)
9. [Cost & runway](#9-cost--runway-staying-free)
10. [Key decisions on the record](#10-key-decisions-on-the-record)
11. [What success looks like](#11-what-success-looks-like)

---

## 1. The one-liner

**Slate is the fastest, cleanest way to write a note and share it with someone — on any device, in two taps.**

That's it. No bloat, no "set up your workspace first," no learning curve. You open Slate, you write, you share. Works across your phone, your laptop, the web — wherever the other person happens to be.

Think Google Keep's speed, with a markdown-aware editor and a sharing flow that doesn't make you think. Wrapped in a monochrome aesthetic with cool light and dark modes that feels less like a productivity tool and more like a beautiful object you actually want to use.

---

## 2. Why this matters (the problem)

Sharing a note between two people on different devices is still annoying in 2026. Your options all have a catch:

| App | The catch |
|---|---|
| **Google Keep** | Fast, but the other person needs a Google account. No markdown, no real formatting. |
| **Apple Notes** | Gorgeous on iPhone, useless the second your friend is on Android or Windows. |
| **Notion / Google Docs** | Powerful but heavy. 3–5 clicks to share one thought. Nobody opens Notion to jot a quick note. |
| **Simplenote** | Closest to the idea — free, cross-platform, email sharing. But plain text only, bare UI, and you can't even share more than one note at a time. |

The gap: nobody has made sharing a nicely-formatted note feel **effortless AND premium AND truly cross-platform** all at once. That's the space Slate lives in.

### The bet we're making

We're not betting on a feature nobody else can build. Any of these features could be cloned. We're betting on **taste and execution** — that if the experience of writing and sharing a note feels genuinely better than everything else, people will use it and tell their friends. The product IS the marketing.

---

## 3. Who it's for

Slate isn't trying to replace your second brain or your company wiki. It's for the quick, human moments of sharing text:

- The person sending a recipe, a packing list, or directions to a friend on a different phone OS
- Couples and roommates sharing a running grocery list or a "don't forget" note
- Someone drafting a message, a bio, or a snippet who wants a second pair of eyes on it
- The markdown-literate user who wants to type `## heading` and `**bold**` and have it just work — while their non-technical friend uses the formatting buttons and gets the same result
- Anyone who's tired of "download this app and make an account" just to read one note someone sent them
- Teams or collaborators sharing a bundle of related notes together — onboarding docs, trip plans, project briefs

---

## 4. Design principles (the non-negotiables)

Every decision in Slate gets checked against these. If a feature breaks one of them, it doesn't ship.

1. **Speed is sacred.** Opening the app to a writable note should take under a second. Sharing should be two taps. Any friction here kills the whole premise.

2. **Minimal, but luxurious — with conviction, in light AND dark.** Slate ships two themes on the same bones: a cool-stone LIGHT mode and a graphite DARK mode (user-chosen, System/Light/Dark). Both are high-contrast — never warm, never muddy. Minimal doesn't mean soft or timid: it means real typographic weight and structure (hairline rules, not whisper shadows) doing the work of decoration. Lots of whitespace. It should feel like a precise instrument — a premium tool, not a utility. Nothing unnecessary made it in; what remains is committed to fully. (See `APP_AESTHETIC.md` — Light "Stone" / Dark "Graphite".)

3. **Cross-platform parity.** The same experience on iOS, Android, and web. No platform is a second-class citizen.

4. **Markdown is the user-facing format; HTML is the storage format.** Power users type markdown syntax directly and it renders instantly. Everyone else uses the toolbar. Both paths produce the same clean output. Under the hood, the editor (TipTap) stores and syncs HTML — but import, export, and paste of `.md` files all work transparently. The distinction is invisible to users.

5. **The recipient should never hit a wall.** You can read a shared note or open a shared folder in the browser with no account. Signing up is only required to edit. Reading is always frictionless.

---

## 5. Structure — notes, files, and folders

This is how Slate organises content. It's intentionally simple — closer to a filesystem than a database.

### The three objects

```
Workspace
└── Folders (optional grouping)
    └── Files (individual markdown notes)
```

- **File** — a single markdown note. The atomic unit of Slate. Can live inside a folder or stand alone at the root level.
- **Folder** — a named collection of files. Purely for organisation and sharing. No nesting (folders inside folders) in v1 — kept flat intentionally.
- **Workspace** — your personal root. Everything you own or have been given access to lives here.

### Why folders matter

Folders are what separate Slate from every simple notes app. The ability to share a **whole folder** — "here's everything you need for the trip" or "this is your onboarding reading" — is something Simplenote flat-out cannot do. It's a real gap we own.

### Sharing model

Both files and folders are independently shareable. Sharing works the same way for both:

| Action | How |
|---|---|
| Share a file | Type an email → they get access to that note |
| Share a folder | Type an email → they get access to all files inside it, including new ones added later |
| Public link (file) | Toggle → anyone with the link can view in browser, no account needed |
| Public link (folder) | Toggle → shareable bundle, opens as a clean read-only index in browser |
| Permissions | Creator sets view-only or can-edit per share |
| Revoke | Remove access to a file or folder at any time |

### Access rules

- **Owner** — full control: create, edit, delete, share, revoke
- **Editor** — can read and edit content; cannot share or delete
- **Viewer** — read-only; can request edit access in one tap
- Sharing a folder does not give access to the owner's other folders or root files — it's scoped tightly

### File organisation

- Files can live in a folder or at the root level (no folder required)
- Files can only live in one folder at a time (no multi-parent in v1)
- Folders are flat — no nesting, no subfolders. Keep it simple.
- Moving a file between folders is supported but doesn't affect who it's shared with

---

## 6. Features

Split clearly into what ships first (MVP) and what comes after. Keeping the MVP genuinely small is the point — a tiny thing that feels perfect beats a big thing that feels okay.

### 6.1 MVP

#### Notes & editing

- [ ] Create, edit, and delete files (markdown notes)
- [ ] Markdown-aware editor: type markdown directly and it renders, OR use formatting toolbar (bold, italic, headings, lists, links, code blocks, blockquotes)
- [ ] Paste raw markdown — it formats instantly
- [ ] Autosave — no save button, ever
- [ ] Clean, distraction-free writing surface in the monochrome cool-grey aesthetic

#### Folders

- [ ] Create, rename, and delete folders
- [ ] Move files into folders or back to root
- [ ] View a folder as a clean list of its files

#### Sharing

- [ ] Share a **file** by typing someone's email — they're notified and it appears in their workspace
- [ ] Share a **folder** by typing someone's email — they get access to all current and future files in it
- [ ] Set permission per share: view-only or can-edit
- [ ] Public share link for files (beautiful browser preview, no signup to read)
- [ ] Public share link for folders (read-only index page, no signup to browse)
- [ ] See who has access to a file or folder
- [ ] Revoke access at any time

#### Accounts & sync

- [ ] Sign in with Google (one tap) or email — Clerk handles this cleanly
- [ ] Everything syncs instantly across all devices
- [ ] Works on iOS, Android, and web from one codebase

### 6.2 Post-MVP roadmap

> **Decision (revised):** v1 ships **turn-based ("walkie-talkie") live editing** — one writer at
> a time, others watch the edits stream in live and tap "request to edit" to take over the pen
> (Supabase Broadcast + Presence; no Yjs). This sits between the old "Level 2" (solo + conflict
> prompt) and "Level 3" (CRDT). The optimistic-lock **merge prompt is dropped** (one writer ⇒
> nothing to merge). Only **true simultaneous co-typing** remains post-MVP. See `LIVE_EDITING.md`
> for the build spec and §13 for the data layer.

Roughly in priority order, built once the core feels right:

- **Live presence** — see when someone else is viewing or editing a shared file in real time ("Maya is editing…") *(now part of v1 turn-based editing)*
- **Real-time simultaneous editing** — two people typing into the same file at the same moment, conflict-free (CRDT-based via Yjs; a bounded one-hook swap in `useFileSync`, no schema migration)
- **Version history** — see and restore past versions of any file
- **Edit-access requests** — a viewer can request edit access in one tap; owner approves or denies
- **Search** — full-text search across all files and folders
- **Folder activity feed** — see recent edits across a shared folder ("Ayaan edited intro.md 2 hours ago")
- **More themes** — light "Stone" and dark "Graphite" already ship (user-chosen, System/Light/Dark; see `APP_AESTHETIC.md` §10). Additional tasteful palettes could follow.

### 6.3 Explicitly out of scope (for now)

Saying no is a feature too. Slate deliberately does NOT do:

- **Images, file attachments, or media** — text only. This is a feature, not a limitation.
- **Nested folders / folder hierarchy** — flat folders only in v1. Complexity can come later if it's genuinely needed.
- **Databases, kanban boards, or "workspace" structure** — that's Notion's job.
- **End-to-end encryption** — see section 10 for why this was a deliberate cut.
- **Comments, mentions, or inline reactions** — keeps the editor clean.
- **Heavy permission systems or admin controls** — not for the core consumer experience.

---

## 7. The growth loop

This is the part that makes Slate more than just a nice app — it has growth baked into how it works.

Every time someone shares a file or folder, the recipient has to open Slate to read it. That recipient is a potential sender. They sign up to edit, then share their own notes, and the cycle repeats. It's the same loop that grew Figma and Notion — every shared artifact is a free acquisition event.

```
Write or organise notes
        ↓
Share file or folder (just type an email)
        ↓
Recipient gets notified
        ↓
Opens in browser — no signup to read (this screen must be flawless)
        ↓
Signs up to edit or reply
        ↓
Creates and shares their own notes
        ↓
        ↻
```

> Because of this, **the recipient's first-open experience — the browser preview page — is arguably the most important screen in the whole product.** It has to feel premium. No signup wall, no banner ads, just the note rendered beautifully.

---

## 8. Tech stack

The locked-in core (not changing): **Expo, Supabase, and Clerk.** Everything else is the current best guess and may shift as we build.

### Locked-in

| Layer | Choice | Why |
|---|---|---|
| App framework | Expo (React Native) | One codebase → iOS, Android, and web |
| Backend / database | Supabase (Postgres) | Database, realtime sync, auth in one place |
| Authentication | Clerk | Cleanest Google login, polished pre-built UI |

### Starting choices (flexible)

| Layer | Choice | Notes |
|---|---|---|
| Editor (web) | TipTap | Markdown-aware, battle-tested, extensible |
| Editor (mobile) | Custom RN input / WebView | To be validated during build |
| Styling | NativeWind | Tailwind utilities across mobile and web |
| Realtime | Supabase Realtime | Broadcast + Presence for live features |
| CRDT (post-MVP) | Yjs | Conflict-free collaborative editing |
| Routing | Expo Router | File-based, works across platforms |

### Integration note

Clerk handles auth; Supabase handles data. They connect by having Supabase verify Clerk's JWT and tying Row Level Security policies to Clerk user IDs. Well-documented pattern — budget about half a day to wire up once at the start.

---

## 9. Cost & runway (staying free)

The plan is to stay free for users and keep costs at zero for as long as possible — riding free tiers until they're genuinely near their limits. That runway is long.

| Service | Free tier | When it costs |
|---|---|---|
| Clerk | 50,000 MAU | $0.02 / user beyond 50k |
| Supabase auth | 50,000 MAU | Bundled with Pro plan |
| Supabase database | 500 MB storage | $25/mo flat on Pro |
| Supabase bandwidth | 10 GB / month | Usage-based on Pro |

**The real bottleneck:** since notes are text-only and text is tiny (a long note ≈ 10–15 KB), the 500 MB database fills up before we hit the user cap — at roughly 35,000 notes. That's a lot of engaged use before paying a cent, and when we do, it's a predictable $25/month.

**Day one task:** free Supabase projects pause after 7 days of inactivity. Set up a daily cron ping via GitHub Actions or Uptime Robot immediately — prevents the app going to sleep during quiet early days.

---

## 10. Key decisions on the record

Decisions we made deliberately, so future-us remembers why.

### Why we dropped encryption

The original idea was end-to-end encrypted notes. We cut it. True E2E means the server never sees plaintext — which means sharing requires key exchange between users, and every elegant way to do that adds friction (passwords, QR codes, key management). Since seamless sharing IS the product, encryption directly fought the core value. Notes are still secured in transit and at rest via Supabase; they're just not zero-knowledge encrypted.

### Why Clerk over Supabase Auth

Supabase has its own auth and it works — but its sign-in UI is bare and you'd build the screens yourself. For an app whose entire bet is on premium UX, a janky login page undercuts everything from the first second. Clerk gives us a beautiful Google login out of the box. Worth the extra integration work.

### Why text-only (no images/files)

No images, no attachments. This keeps Slate fast, cheap to run, and focused. It's the constraint that makes everything else simple. Revisit in v2 if there's genuine demand.

### Why flat folders (no nesting)

Nested folder hierarchies sound good until you have to build and navigate them on mobile. Flat is faster, simpler, and covers 95% of real use cases. If deep nesting becomes a genuine user request, we'll add it — but we're not building it speculatively.

### Why HTML at rest, not raw markdown

TipTap is HTML-native. `editor.getHTML()` is its primary output — well-formed HTML with zero ambiguity. Storing raw markdown instead would require:

1. Converting HTML → markdown on **every keystroke** (requires `@tiptap/extension-markdown`, which is Tiptap Pro — paid)
2. Converting markdown → HTML on **every load** (free with `marked`, but introduces round-trip edge cases for code blocks, nested lists, footnotes, and any custom syntax)

The simplest correct approach: store HTML, convert to/from markdown **only at import/export boundaries** — two one-shot operations. The user experience is identical: typing markdown syntax still works natively in TipTap, toolbar buttons still produce formatted output, and pasting a `.md` file converts automatically. The difference is invisible to users and eliminates an entire class of round-trip conversion bugs.

### Why this doc lives in GitHub

Design docs belong with the code. Version-controlled, readable directly in the repo, no app needed to open it, and it stays current as the product evolves. Update this file when decisions change — stale docs are worse than no docs.

---

## 11. What success looks like

Early on we're not chasing revenue — we're chasing signal. The questions that matter:

- **Do recipients convert into senders?** The growth loop only works if people who receive a shared note go on to create their own. This is the single most important metric early on.
- **Is the share flow actually two taps in real use?** Not in theory — in real-world testing.
- **Do people describe Slate as "clean" or "nice to use" unprompted?** The taste bet paying off.
- **Are notes and folders being shared, not just created?** A Slate used only solo isn't working — sharing is the whole point.

A rough early milestone: a few thousand people actively using it, with a meaningful share rate and recipients converting into senders. Hit that, and there's a real product worth investing in further.

---

## 12. Screen architecture

### Screen inventory

| Screen | Route | Auth required | Description |
|---|---|---|---|
| Sign in | `/(auth)/sign-in` | No | Google + email login |
| Home | `/(app)/` | Yes | All notes + folders grid, ＋ create button |
| Folder view | `/(app)/folder/[id]` | Yes | Folder contents (flat — no subfolders in v1) |
| Note editor | `/(app)/note/[id]` | Yes | Markdown editor, toolbar, autosave |
| Account settings | `/(app)/account` | Yes | Profile, shared-with-me link, sign out |
| Shared with me | `/(app)/shared-with-me` | Yes | Notes and folders others shared with you |
| Note actions (sheet) | `/(app)/(modals)/note-actions/[id]` | Yes | Long-press popup: share, move, settings, delete |
| Note settings (sheet) | `/(app)/(modals)/note-settings/[id]` | Yes | Rename, move to folder, delete |
| Share (sheet) | `/(app)/(modals)/share/[type]/[id]` | Yes | Email share + permission toggle + public link |
| Move to folder (sheet) | `/(app)/(modals)/move/[id]` | Yes | Folder picker |
| Public viewer | `/s/[slug]` | No | Read-only browser page, no login needed |

### Expo Router file structure

```
app/
├── _layout.tsx                          # Root: ClerkProvider, fonts, global providers
├── (auth)/
│   ├── _layout.tsx                      # Redirect to home if signed in
│   └── sign-in.tsx                      # Login screen (already built)
├── (app)/
│   ├── _layout.tsx                      # Protected: redirect to sign-in if signed out
│   ├── index.tsx                        # HOME — notes + folders grid, ＋ create
│   ├── folder/
│   │   └── [id].tsx                     # FOLDER VIEW — contents + subfolders
│   ├── note/
│   │   └── [id].tsx                     # NOTE EDITOR — markdown + toolbar + autosave
│   ├── account.tsx                      # ACCOUNT SETTINGS — profile, sign out
│   ├── shared-with-me.tsx               # SHARED WITH ME — notes others shared
│   └── (modals)/
│       ├── _layout.tsx                  # Presents all children as bottom sheets
│       ├── note-actions/
│       │   └── [id].tsx                 # Long-press action menu
│       ├── note-settings/
│       │   └── [id].tsx                 # Rename, move, delete
│       ├── share/
│       │   └── [type]/
│       │       └── [id].tsx             # Share screen ([type] = 'file' | 'folder')
│       └── move/
│           └── [id].tsx                 # Folder picker for "move to folder"
└── s/
    └── [slug].tsx                        # PUBLIC VIEWER — no auth, web-accessible
```

### Root-level structure

```
lib/
├── supabase.ts                          # Supabase client, Clerk JWT wired in
└── tokenCache.ts                        # Clerk secure token cache
hooks/
├── useProfile.ts                        # Signed-in user's profile row
├── useFiles.ts                          # Files CRUD + realtime subscription
├── useFolders.ts                        # Folders CRUD + realtime subscription
├── useFileSync.ts                       # Live content sync, Presence, soft lock
├── useShares.ts                         # Share CRUD (grant, revoke, list grantees)
└── usePublicFile.ts                     # Slug → file lookup, no auth (public viewer)
components/
├── ui/                                  # Styled primitives
│   ├── Button.tsx
│   ├── Text.tsx
│   ├── Input.tsx
│   └── Card.tsx
├── NoteCard.tsx                         # Note tile in the home/folder grid
├── FolderCard.tsx                       # Folder tile in the home grid
├── MarkdownRenderer.tsx                 # Read-only markdown display (viewer, shared)
└── MarkdownEditor.tsx                   # Editable markdown — platform-aware
types/
└── db.ts                                # TypeScript types mirroring the DB schema
theme/
└── tokens.ts                            # Design tokens (colors, spacing, type)
```

---

## 13. Data layer — live sync, locking, and markdown

### Live data

Supabase Realtime drives all live updates. The rule is: **every hook owns its subscription**. No component sets up a `supabase.channel(...)` call directly.

- `useFiles` subscribes to `files` rows the user can see (by `owner_id` or share grant)
- `useFolders` subscribes to `folders` by `owner_id`
- `useFileSync` handles the open note editor specifically — it broadcasts content deltas over a broadcast channel and tracks presence for the lock indicator

On web, subscriptions are WebSocket-based. On native, Supabase Realtime works the same way — no platform difference.

### File locking (soft, ephemeral — Presence not DB)

When someone opens a note to edit, other viewers should see "Maya is editing…" and their own editor should go read-only. The mechanism:

- **Supabase Presence**, not a database column, tracks who is currently editing.
- Presence is ephemeral: it lives in-memory on Supabase's realtime server and automatically clears the moment a user disconnects (app closed, network drop, tab killed). There is no stale lock cleanup needed.
- `useFileSync` joins the note's presence channel on mount and broadcasts `{ editing: true, userId, displayName }`.
- Other clients subscribed to the same channel receive the presence state update and render the lock indicator.
- The file remains **readable** by everyone at all times. The lock only signals "don't start a competing edit."
- No `locked_by` column in the database. A DB lock would require TTL management and cleanup jobs — Presence handles it for free.

### Conflict handling (turn-based — pre-CRDT)

Slate v1 avoids write conflicts structurally rather than resolving them: **only one person holds
the pen at a time** (enforced by the Presence soft-lock), so two clients never write the same
file concurrently. There is **no merge prompt** — there is nothing to merge.

- The pen-holder is the sole DB writer; viewers are read-only and watch via the live broadcast.
- On hand-over, the writer releases the lock and the next person loads the freshly-saved content
  before acquiring — a clean baseline, no overlap.
- The `version` integer is kept as save bookkeeping (`version + 1` on each autosave) but is **no
  longer a conflict-resolution mechanism**.

This is correct and simple for the one-writer-at-a-time model. When Yjs CRDT (true simultaneous
editing) arrives post-MVP, `useFileSync` is the only hook that changes — `yjs_state` already
exists, so there is no schema migration. See `LIVE_EDITING.md`.

### Content storage format — HTML at rest

Notes are stored as **HTML strings** (TipTap's native output) in `files.content`. No raw markdown is stored in the database.

| Operation | How |
|---|---|
| Edit + autosave | `editor.getHTML()` → `files.content` — zero conversion, no loss |
| Load note | `files.content` (HTML) → `editor.setContent(html)` — zero conversion |
| Paste markdown | `marked.parse(text)` → HTML → `editor.insertContent(html)` — one-time convert on paste |
| Import `.md` file | `marked.parse(fileText)` → HTML → `files.content` — one-time convert on upload |
| Export `.md` | `turndown(files.content)` → `.md` download — **TODO: post-MVP** |
| Export `.html` | serve `files.content` directly — **TODO: post-MVP** |
| View mode (read-only) | render `files.content` HTML directly — WebView on native, `dangerouslySetInnerHTML` on web |
| Public viewer (`/s/[slug]`) | same as view mode — no conversion needed |

**Why not markdown at rest?** See §10 key decisions.

**Libraries:**
- `marked` — converts markdown → HTML (paste detection, file import)
- `turndown` — converts HTML → markdown (export, post-MVP) — **not yet installed**

### Mutation tracking

For v1, `files.version` + `files.updated_at` + `files.updated_by` together answer "who changed this and when." No separate mutations table.

Post-MVP "version history" will introduce a `file_snapshots` table in its own migration:

```sql
-- (not built yet — post-MVP)
create table file_snapshots (
  id         uuid primary key default gen_random_uuid(),
  file_id    uuid not null references files(id) on delete cascade,
  version    integer not null,
  content    text not null,
  saved_by   text references profiles(id),
  saved_at   timestamptz default now()
);
```

When that ships, every save writes a row here. Until then, no change to the existing schema.

---

## 14. Visibility model

### Current schema (what's live now)

`files` has `is_public boolean` and `public_slug text`. `folders` have neither. This is what `0001_init.sql` contains today.

### Why this needs to change (TODO)

`is_public: boolean` conflates two concerns:

1. **Who can access this resource?** (Owner only / named invitees / anyone)
2. **Is the public share link active?** (A specific URL anyone can use)

A file can be shared with named editors AND have a public link active simultaneously. A boolean can't express that. Folders have no visibility model at all, which means shareable folder pages can't be built yet.

### Planned change — `0002_visibility.sql` (not written yet)

Replace `is_public` with a `file_visibility` enum shared across files and folders:

```sql
create type file_visibility as enum ('private', 'invited', 'public');
```

| Value | Meaning |
|---|---|
| `private` | Owner only. No shares, no public link. |
| `invited` | Accessible only to users listed in `shares`. No public link. |
| `public` | `public_slug` is set; anyone with the link can view. Invited editors may also exist alongside. |

State transitions (managed by `useShares`):

```
Create note      → private
Add a share      → invited   (if public_slug is null)
Enable pub link  → public    (regardless of shares)
Revoke all +
disable link     → private
```

Folders need the same model — add `visibility` and `public_slug` to `folders` in the same migration.

> **TODO:** Write `supabase/migrations/0002_visibility.sql` when ready to implement sharing. Before applying, check for any rows with `is_public = true` — they'll need `visibility = 'public'` set in the same migration before the column is dropped.

---

## In one breath

> Slate is a beautiful, dead-simple notes app where writing is instant, markdown just works, and sharing a file or a whole folder with anyone on any device takes two taps. It's free, it's cross-platform, and it grows every time someone shares. We win on taste, not features — and that's the whole point.

---

_This document should stay alive as the product evolves. When a decision changes, update the record here — including why it changed._
