
# AGENTS.md — Build instructions for Slate

> Read this whole file before writing any code. It is the source of truth for how Slate is built. If something here conflicts with `DESIGN.md`, this file wins for implementation details — but tell the human so the docs can be reconciled.

---

## 0. Who you are and how to behave

You are an AI coding agent scaffolding a real cross-platform app. Work in **small, verifiable steps**. After each milestone, stop, summarise what you did, and confirm it runs before moving on. Do not generate the entire app in one pass.

**Rules:**

- One milestone per working block. Do not skip ahead.
- After each milestone, print: what changed, how to run it, and how to verify it works.
- Read the code you write back to the human in plain language — they want to understand it, not just run it.
- Never invent setup steps from memory. Clerk and Supabase integration details change often — when wiring auth, **check the current official docs** for the Clerk + Supabase "Third-Party Auth" integration (the older JWT-template approach is deprecated) and follow the latest pattern.
- Commit to git after every milestone that runs.
- TypeScript everywhere. No `any` unless truly unavoidable.

---

## 1. What we're building

Slate is a minimal, cross-platform (iOS / Android / web) notes app where writing is instant, notes are markdown, and sharing a note or folder with anyone takes two taps. Black-and-white, luxury-minimal aesthetic. See `DESIGN.md` for the full product vision.

**This file covers the foundation build**, ending at a running app with login and a working home page.

---

## 2. Locked tech stack (do not substitute)

| Layer | Choice |
|---|---|
| Framework | Expo (React Native) + Expo Router |
| Language | TypeScript |
| Styling | NativeWind (Tailwind for RN) |
| Auth | Clerk (Google login + email) |
| Backend / DB | Supabase (Postgres + Realtime) |

Everything else (editor library, etc.) comes in later phases — do not add it yet.

---

## 3. Core architectural principles (these shape every decision)

1. **Isolate all data access behind hooks.** No component ever calls `supabase.from(...)` directly. All reads/writes/subscriptions live in custom hooks (`useFiles`, `useFolders`, and later `useFileSync`). This is non-negotiable — it's what makes the future CRDT upgrade a one-hook change instead of a rewrite.

2. **Build for Level 2 realtime now, Level 3 (CRDT) later.** v1 uses simple content sync + a soft edit-lock (one editor at a time, detected via Supabase Presence). The schema already includes a `yjs_state` column so upgrading to Yjs CRDT later requires **zero schema migration**. Keep content sync logic in ONE place so swapping it out is trivial.

3. **The recipient never hits a wall.** Reading a shared/public note must work with no account. Auth is only required to edit. (Relevant in later phases, but design routes with this in mind.)

4. **Cross-platform parity.** Everything must work on web and native. Don't use APIs that only exist on one platform without a fallback.

---

## 4. Data model

> **Folders are flat in v1.** The UI and dummy data enforce one level only (root → folder → files). The `parent_folder_id` column exists in the schema so nested folders can be introduced later without a migration, but it is unused in the app today. See **post-MVP TODO** below.

### The shape

- **Folder**: lives at root level only (`parent_folder_id` is always `null` in v1). One level of depth — no subfolders.
- **File**: has an optional `folder_id` pointing at its containing folder (or `null` = not in any folder, lives at root).
- Both files and folders are owned by exactly one user and shareable independently.

> **Post-MVP TODO — nested folders + sharing:** When ready, enable `parent_folder_id` in the UI (folder picker, breadcrumbs deeper than two levels) and implement recursive folder-share inheritance in RLS (a share on a parent propagates to all descendants). The schema already supports this; only the UI and policies need updating.

### Tables

```sql
-- profiles: mirror of Clerk users so we can do SQL joins
create table profiles (
  id           uuid primary key,            -- matches Clerk user ID
  email        text not null unique,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now()
);

-- folders: nested (tree) structure
create table folders (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references profiles(id) on delete cascade,
  parent_folder_id uuid references folders(id) on delete cascade,  -- null = root level
  name             text not null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- files: the notes themselves
create table files (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  folder_id   uuid references folders(id) on delete set null,  -- null = root level
  title       text not null default '',
  content     text not null default '',     -- markdown string (Level 2)
  updated_by  uuid references profiles(id),  -- who saved last
  version     integer not null default 1,    -- optimistic locking
  yjs_state   bytea,                          -- NULL until CRDT upgrade (Level 3)
  is_public   boolean not null default false, -- public link toggle
  public_slug text unique,                    -- e.g. /s/abc123
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- shares: handles BOTH file and folder shares in one table
create table shares (
  id            uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id   uuid not null,
  owner_id      uuid not null references profiles(id),
  shared_with   uuid references profiles(id),   -- null = invite pending (no account yet)
  invited_email text,                            -- email used before they sign up
  permission    text not null default 'view' check (permission in ('view','edit')),
  created_at    timestamptz default now(),
  unique (resource_type, resource_id, invited_email)
);
```

### Notes for the agent on the schema

- Define this as a migration in `supabase/migrations/0001_init.sql`.
- `on delete cascade` on `parent_folder_id` means deleting a folder deletes its subfolders. Confirm this is the desired behaviour with the human before relying on it (alternative: reparent children to root).
- RLS policies: for the **foundation milestone**, set up basic owner-only policies (a user can CRUD their own rows). The recursive folder-share-inheritance policy is complex and comes in the sharing phase — do NOT build it yet, just leave a clear `-- TODO: folder share inheritance` comment.
- Create a Postgres function + trigger that inserts a `profiles` row when a new Clerk user first appears (or do it on first sign-in from the client). Pick the simpler path and document it.

---

## 5. Project structure

Set the project up exactly like this:

```
slate/
├── app/                          # Expo Router routes (file-based)
│   ├── _layout.tsx               # Root: ClerkProvider, fonts, global providers
│   ├── (auth)/
│   │   ├── _layout.tsx           # Redirects to home if already signed in
│   │   └── sign-in.tsx           # Login screen (Google + email via Clerk)
│   └── (app)/
│       ├── _layout.tsx           # Protected: redirects to sign-in if signed out
│       └── index.tsx             # HOME PAGE — "Hello, {name}" (the start page)
│
├── lib/                          # (root-level, no src/ wrapper)
│   ├── supabase.ts               # Supabase client, wired to Clerk session token
│   └── tokenCache.ts             # Clerk secure token cache (expo-secure-store)
├── hooks/                        # ALL data access lives here (see principle #1)
│   └── .gitkeep                  # (useFiles, useFolders added in later phases)
├── components/
│   └── ui/                       # Reusable styled primitives (Button, Text, etc.)
├── types/
│   └── db.ts                     # TypeScript types matching the DB schema
├── theme/
│   └── tokens.ts                 # Black/white design tokens (colors, spacing, type)
│
├── supabase/
│   └── migrations/
│       └── 0001_init.sql         # The schema from section 4
│
├── global.css                    # Tailwind directives
├── tailwind.config.js            # NativeWind config + theme tokens
├── babel.config.js               # NativeWind babel plugin
├── metro.config.js               # NativeWind metro config
├── app.json                      # Expo config
├── .env.local                    # Secrets (gitignored) — see section 7
├── .env.example                  # Template with empty keys (committed)
├── AGENTS.md                     # This file
└── DESIGN.md                     # Product design doc
```

---

## 6. Build sequence (do these IN ORDER, stop after each)

### Milestone 1 — Project + styling skeleton

1. Assume an initialized Expo project exists (Expo Router, TypeScript). If not, scaffold one with the Expo Router template.
2. Install and configure **NativeWind**: `tailwind.config.js`, `global.css`, `babel.config.js`, `metro.config.js`. Verify a Tailwind-styled `<Text>` renders on both web and native.
3. Create `theme/tokens.ts` with the black/white palette (near-black ink `#1A1A1A`, off-white background, a couple of greys). Wire tokens into the Tailwind theme.
4. Set up the folder structure from section 5 (empty files / `.gitkeep` where needed).
5. **Verify:** app runs on web (`bun expo start --web`) and shows a styled placeholder. Commit.

### Milestone 2 — Clerk auth + login screen

1. Install Clerk Expo SDK. Add `ClerkProvider` in `app/_layout.tsx` with the secure token cache (`lib/tokenCache.ts` using `expo-secure-store`).
2. Build `app/(auth)/sign-in.tsx`: Google login button + email option, styled to the minimal aesthetic. Use Clerk's hooks/components.
3. Set up route protection: `(app)/_layout.tsx` redirects signed-out users to `/sign-in`; `(auth)/_layout.tsx` redirects signed-in users to home.
4. **Check current Clerk docs** for the correct Expo OAuth setup (redirect URIs, `expo-auth-session`, etc.) — do not guess.
5. **Verify:** can sign in with Google, land on a blank protected home, sign out, get redirected back. Commit.

### Milestone 3 — Supabase connection + Clerk integration

1. Install `@supabase/supabase-js`. Create `lib/supabase.ts`.
2. Wire Supabase to accept the Clerk session token so RLS sees the right user. **Use the current Clerk↔Supabase Third-Party Auth integration** (check docs — the JWT-template method is deprecated).
3. Run the `0001_init.sql` migration against the Supabase project. Confirm tables exist.
4. Ensure a `profiles` row is created for the signed-in user (trigger or client-side on first login).
5. **Verify:** signed-in user has a `profiles` row; a test authenticated query returns only that user's rows (RLS working). Commit.

### Milestone 4 — Home page with "Hello" working (THE START PAGE)

1. Build `app/(app)/index.tsx` as the home/start page.
2. It must: confirm the user is authenticated, read their display name (from Clerk and/or their `profiles` row via a `useProfile` hook in `hooks/`), and render **"Hello, {name}"** in the Slate aesthetic.
3. Include a clean sign-out control.
4. This is the milestone the human asked for: **login → home page that says hello, working end to end, on web and native.**
5. **Verify:** fresh load → sign in → see "Hello, {their name}" → sign out → back to login. Works on web and at least one native target. Commit.

### Stop here

After Milestone 4, summarise the full state and wait for the human before starting notes/folders/editor work.

---

## 7. Environment & secrets

Create `.env.local` (gitignored) and a committed `.env.example` with these keys empty:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

- Never commit real keys. Confirm `.env.local` is in `.gitignore`.
- Ask the human to paste their keys when needed; don't fabricate placeholder values that look real.

---

## 8. Operational reminders

- **Supabase free-tier pausing:** free projects pause after 7 days of inactivity. After the project is live, set up a daily cron ping (GitHub Actions or Uptime Robot) to keep it awake. Note this as a TODO for the human; don't block on it.
- **Keep `useFileSync` in mind:** when notes/editing get built later, all save/load/subscribe logic goes in one hook. The whole CRDT-upgrade strategy depends on this. Do not scatter Supabase calls across components.

---

## 9. Definition of done (foundation)

- [ ] Expo project runs on web and native with NativeWind styling working
- [ ] Black/white theme tokens defined and applied
- [ ] Clerk Google + email login works, with route protection
- [ ] Supabase connected; Clerk token integrated so RLS identifies the user
- [ ] All four tables created via migration; owner-only RLS in place
- [ ] `profiles` row auto-created on sign-in
- [ ] Home page shows "Hello, {name}" end-to-end
- [ ] Each milestone committed to git

When all boxes are checked, stop and report.
