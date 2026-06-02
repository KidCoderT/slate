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

Think Google Keep's speed, with a markdown-aware editor and a sharing flow that doesn't make you think. Wrapped in a black-and-white aesthetic that feels less like a productivity tool and more like a beautiful object you actually want to use.

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

2. **Minimal, but luxurious.** Black and white. Lots of whitespace. Considered typography. It should feel like a premium object, not a utility. Minimal doesn't mean cheap — it means nothing unnecessary made it in.

3. **Cross-platform parity.** The same experience on iOS, Android, and web. No platform is a second-class citizen.

4. **Markdown is the foundation.** Notes are markdown under the hood. Power users type it directly; everyone else uses buttons. Both paths produce the same clean output.

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
- [ ] Clean, distraction-free writing surface in the black/white aesthetic

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

Roughly in priority order, built once the core feels right:

- **Live presence** — see when someone else is viewing or editing a shared file in real time ("Maya is editing…")
- **Real-time collaborative editing** — two people editing the same file simultaneously, conflict-free (CRDT-based via Yjs; the architecture supports this from day one)
- **Version history** — see and restore past versions of any file
- **Edit-access requests** — a viewer can request edit access in one tap; owner approves or denies
- **Search** — full-text search across all files and folders
- **Folder activity feed** — see recent edits across a shared folder ("Ayaan edited intro.md 2 hours ago")
- **Light theming** — a small set of tasteful alternatives beyond the default black/white

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

## In one breath

> Slate is a beautiful, dead-simple notes app where writing is instant, markdown just works, and sharing a file or a whole folder with anyone on any device takes two taps. It's free, it's cross-platform, and it grows every time someone shares. We win on taste, not features — and that's the whole point.

---

_This document should stay alive as the product evolves. When a decision changes, update the record here — including why it changed._
