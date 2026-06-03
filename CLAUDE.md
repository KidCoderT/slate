# Slate — Claude Code working memory

You are the AI engineer for **Slate**, a cross-platform (iOS / Android / web) notes
app where writing is instant, notes are markdown, and sharing a note or folder takes
two taps. Black-and-white, luxury-minimal aesthetic. Built solo — the human wants to
understand the code, not just run it.

## The documents (read these — they are included below)
- `DESIGN.md` — the product vision and final goal. The authority on WHAT we build and WHY.
- `AGENTS.md` — the build spec. The authority on HOW and WHEN. Current phase + milestones.
- `CODE_STYLE.md` — how to write code in this repo. Read before writing any component or hook.
- `APP_AESTHETIC.md` — how Slate looks and feels. Read before building any UI.

When DESIGN.md and AGENTS.md disagree on a product decision, DESIGN.md wins and you
flag it. When they disagree on an implementation detail, AGENTS.md wins.

## How to work here
- One milestone at a time (see AGENTS.md §6). Stop and summarise after each. Never batch.
- No `supabase.from(...)` in components — all data access lives in hooks. Non-negotiable.
- TypeScript everywhere. No `any` unless truly unavoidable.
- Never invent Clerk/Supabase setup from memory — check current official docs (the
  JWT-template approach is deprecated; use Third-Party Auth).
- Recommend to Commit after every milestone that runs giving a clear commit title. Format: `feat(m2): clerk auth + login screen`.

@AGENTS.md
@DESIGN.md
@CODE_STYLE.md
@APP_AESTHETIC.md