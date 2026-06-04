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

## UI primitives — enforced patterns

- Raw `<Text>` from `react-native` is banned in screens and components.
  Always import from `@/components/ui/Text` instead.
- `components/ui/Text.tsx` is the canonical reference component.
  Every new primitive should match its pattern: NativeWind className,
  token-only colours, explicit typed props, cn() for overrides.
- Text that must appear white on a dark background: pass `style={{ color: '#FFFFFF' }}`
  explicitly — do not rely on the `inverted` prop alone on web (NativeWind className
  specificity can lose to `text-ink` on web).

## Memory — update at end of every session

The project memory lives at:
`~/.claude/projects/c--Users-csc-DevStuff-slate/memory/`

At the end of every session where meaningful work happened, update the relevant memory files:
- `project-state.md` — if the build phase advanced or new components were completed
- `feedback-code-style.md` — if a new pattern was enforced or a violation was fixed
- `design-decisions.md` — if a product or tech decision was made or changed
- `user-profile.md` — if you learned something new about how the user works

You will be reminded by a stop hook. Do not skip this — stale memory is worse than no memory.