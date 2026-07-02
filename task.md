Slate — Live-Editing Audit Report
Scope: hooks/useFileSync.ts, app/(app)/note/[id].tsx, both editor components, the WebView payload, the realtime/RLS backend, and the note screen's UX vs APP_AESTHETIC.md / DESIGN.md. Context: Audit of the walkie-talkie editing engine for speed bottlenecks, compute/bandwidth cost, implementation flaws, and aesthetic-doc violations. This is a findings report — no fixes applied.

A. Correctness bugs (found while tracing the flows)
A1. Title can be reverted on pen handover — data loss ⚠️ HIGHEST
The content broadcast carries only { html, version } (useFileSync.ts:254-258), and the grant handler re-fetches only version (useFileSync.ts:606). Titles are never mirrored. Sequence:

A opens note (title "Draft"), B opens note. B's titleRef = "Draft".
A renames to "Final", autosaves. B's titleRef is still "Draft".
A hands the pen to B. B types one character → first save UPDATEs title: titleRef.current = "Draft" — A's rename is silently destroyed. Same path makes viewers see a stale title for the whole session (content mirrors live, title doesn't).
A2. Toolbar link button inserts a blockquote
MarkdownToolbar.tsx:35 — the Link2 icon dispatches action: 'quote'. There is no 'link' action anywhere in the pipeline. Two adjacent buttons do the same thing; the advertised link feature doesn't exist.

A3. Handover version race — flushSave() is not awaited
acceptRequest() (useFileSync.ts:404-431) calls flushSave() (fire-and-forget async), then immediately broadcasts content with versionRef.current — which hasn't been incremented yet because the save is still in flight. The grant-side DB re-fetch (useFileSync.ts:606) can also race the in-flight save and read the pre-save version. Result: the new holder's first save can hit a version conflict → permanent "Couldn't save" (see A4). flushSave should be async and awaited before the content/grant broadcasts.

A4. Save errors are a dead end
On any 0-rows-updated result (useFileSync.ts:177-201), the hook runs a diagnostic fetch (an extra round-trip whose only output is a console log) and sets saveStatus = 'error'. There is no recovery: no re-fetch of the DB row, no version re-sync, no retry. A single transient conflict leaves the writer staring at "Couldn't save" while continuing to type into a note that will never save again until reopen.

A5. Unmount broadcasts may never leave the socket
The cleanup (useFileSync.ts:680-712) fires content + pen-released sends, then immediately removeChannel(ch) in a void IIFE. ch.send() is async; closing the channel right behind it means the "instant pen-free" signal the whole design leans on can be silently dropped — viewers fall back to multi-second Presence GC, exactly the lag the broadcast was added to avoid.

A6. seen_at unread tracking is dead code
0006_beta_features.sql:7 comments "set to now() by useFileSync when a shared note is first loaded" — no code anywhere writes seen_at (grep confirms; ROADMAP.md:202 still unchecked). Either the migration comment is wrong or the feature was never wired. Shared-note "new" badges will never clear.

B. Performance & cost bottlenecks
Frontend
B1. Full-document broadcast every 200ms — the big one
scheduleBroadcast (useFileSync.ts:247-261) ships the entire HTML document up to 5×/sec while typing. For DESIGN's own "long note ≈ 10–15 KB": ~50–75 KB/s upstream from the writer, × every viewer downstream, for the duration of typing. This is the dominant realtime cost and burns straight into the Supabase free-tier message/bandwidth quotas the whole §9 cost model depends on. Even without going full-delta, "skip if unchanged" + a longer throttle for large docs would cut this dramatically.

B2. Viewer-side cost: full ProseMirror re-parse per broadcast
Every received broadcast → applyRemoteContent → setContentState → editor setContent(html):

Web: MarkdownEditorWeb.tsx:103-107 re-parses the whole document into ProseMirror up to 5×/sec.
Native is worse: MarkdownEditorNative.tsx:46-51 does injectJavaScript("window.setContent(<entire doc as JSON string>)") 5×/sec — string-serialising the document across the RN↔WebView bridge each time, then a full TipTap re-parse inside the WebView. O(doc size) CPU on every viewer device, continuously.
B3. Every keystroke re-renders the entire note screen
The hook keeps content in React state and updates it on each editor onChange (useFileSync.ts:269-274). For the writer, the editor is already the source of truth — this state exists only so viewers can mirror — yet every keystroke re-renders NoteEditor and its whole subtree: header, PresenceAvatars, MarkdownToolbar (two ScrollViews rebuilt), pills, banners. Nothing is memoized (React.memo absent on toolbar/avatars; avatarUsers rebuilt inline each render, [id].tsx:86-93). On native, postHeight() fires on every update too (tiptapEditorHtml.ts:124-127 → setWebViewHeight, [id].tsx:351), so each keystroke additionally triggers a WebView resize — one of the most expensive layout operations RN can do.

B4. Native editor loads TipTap from esm.sh CDN at runtime
tiptapEditorHtml.ts:92-94 imports @tiptap/core, starter-kit, and marked from a third-party CDN on every WebView init. Consequences: first note-open on native needs a network fetch of an editor framework (directly violates DESIGN §4.1 "opening the app to a writable note should take under a second"); offline = no editor at all; a supply-chain/SPOF dependency on esm.sh; and web (bundled) vs native (CDN) breaks parity in spirit. These libs should be bundled into the app and inlined into the HTML.

B5. Autosave write amplification through postgres_changes
0004_realtime.sql added files to the realtime publication, so every 700ms-debounced save ships the full row — including the entire content HTML — to every client subscribed to file lists (home screen, folder views) of every user with access. A typing session = a continuous stream of full-document rows to devices that only need title/updated_at for a list. This compounds B1: the same content travels twice. Consider a column list on the publication or moving list refresh to lighter signals.

B6. Per-keystroke saveStatus churn
scheduleSave (useFileSync.ts:210-219) sets setSaveStatus('saving') on every keystroke, forcing extra renders and the flickering dot described in C4.

B7. Sequential load waterfall
load() (useFileSync.ts:743-810) fetches the file, then the share row — two serial round-trips before first paint for shared users. Parallelize or fold into one query/RPC. The grant handler similarly blocks pen activation on a DB round-trip (useFileSync.ts:606) — acceptable as a deliberate safety trade, but it makes handover feel slower than it needs to.

B8. console.log firehose in production
LOG (useFileSync.ts:124-126) fires on every presence sync, every received broadcast (≤5×/sec per viewer), every save. RN console.log is genuinely expensive, and CODE_STYLE.md §7 explicitly bans committed console.log. Should be gated behind __DEV__ (or stripped).

Backend
B9. Duplicate permissive RLS policies on files
0002_sharing.sql:25-46 and 0005_share_access.sql:15-48 both create a shared-SELECT and a shared-UPDATE policy with near-identical exists(select … from shares) predicates. Permissive policies are OR'd — both run on every files query, doubling the subquery work. 0005 looks like a rewrite of 0002 that forgot to drop the originals. (0005's versions also add is_public and a with check, so the pairs aren't even identical — two sources of truth.)

B10. No indexes behind the RLS subqueries
No migration creates indexes on shares(resource_type, resource_id, shared_with), shares(shared_with), files(owner_id), files(folder_id), or shares(owner_id). Every RLS check on files runs the exists subquery (×2, per B9) against an unindexed shares table — sequential scans on the hottest path in the app (every load, every 700ms autosave). Fine at 10 rows; a real cost cliff as shares grow.

B11. requesting_user_id() evaluated per row in policies
All policies call requesting_user_id() bare. Supabase/Postgres best practice is (select requesting_user_id()) so it's evaluated once per statement (InitPlan) instead of potentially per row. Cheap to fix in one migration; compounds with B9/B10.

B12. profiles email exposure contradicts the earlier design
0002 built find_profile_by_email as security definer specifically so profile emails were never exposed ("never the email"). 0005:67-69 then opened SELECT on all profiles including email to any authenticated user — a scrapeable email directory. The 0005 comment acknowledges it; flagging that this contradicts the deliberate 0002 design and should be narrowed (column-level grant or a profiles view without email) before any public beta.

B13. Redundant 50s auth-refresh interval per hook instance
The setInterval(setAuth) (useFileSync.ts:667-669) is per-mounted-hook. Any other realtime hook doing the same (and the singleton client makes this global anyway) duplicates Clerk token fetches. Belongs once in lib/supabase.ts, not in every hook.

Code health (smaller)
Dead/misleading bits: load-effect deps include save which it never uses (useFileSync.ts:810); [id].tsx:27 comment claims Metro .web.tsx/.native.tsx resolution but the files don't use platform extensions (the conditional require is what actually does the work).
Triplicated editor logic: ToolbarAction type defined twice (MarkdownToolbar.tsx:8, MarkdownEditorWeb.tsx:40); the execCommand if-chain exists in MarkdownEditorWeb.tsx:84-95 AND tiptapEditorHtml.ts:159-172; the ProseMirror CSS block is fully duplicated between MarkdownEditorWeb.tsx:17-35 and tiptapEditorHtml.ts:31-73 (already drifted: native has the placeholder rule, web doesn't). One source should generate all of these.
Tiebreak loser's keystrokes silently lost — known edge of the design; worth a one-line "Someone else started editing" notice when yielding rather than a silent revert.
C. UX/UI vs APP_AESTHETIC.md & DESIGN.md
C1. Non-palette blue hardcoded in the hook
FALLBACK_COLOR = '#4A87D6' (useFileSync.ts:44). APP_AESTHETIC §2: "No blue… If a colour use isn't in the table above, it does not ship," and avatar colours must come from the per-user palette. The fallback should come from theme/avatarColors. This is the single clearest token violation in the feature.

C2. Zero press feedback on header actions
Share and Done buttons use activeOpacity={1} ([id].tsx:228, 238) — no feedback at all, while the back button correctly uses 0.65. §5 defines press states as clean opacity fades; a dead-feeling tap reads as broken, the opposite of premium. (Also: the invisible title overlay at [id].tsx:317-323 has activeOpacity={0.65} — a fade on an invisible element, i.e. still no visible feedback.)

C3. Banner stack reflows the writing surface
Offline strip, edit-request banner, requester feedback, and "X is now editing" all render as stacked full-width strips above the content ([id].tsx:249-293), pushing the title and editor down when they appear/disappear. For a "meditative, unhurried" product, the text you're reading/writing jumping 40px because someone opened the note is the most aesthetic-hostile behaviour on the screen. Ambient notices and the request banner should float/overlay (like the presence pill already does) rather than reflow. Related: all four use the identical editRequestBanner style — the one actionable interrupt (Hand over / Keep) has the same visual weight as ignorable ambient noise, muddying the hierarchy the AGENTS.md presence-UX table implies.

C4. The save dot flickers on every keystroke
Each keystroke flips the dot to grey "Saving…" (scheduleSave) and back to green 700ms+ later — a constant blink right under the title while writing. §8: "the content IS the feedback"; a status light strobing during normal typing is gamified anxiety, not calm. Also 'idle' maps to green "Saved" ([id].tsx:160-172), so a freshly opened, never-saved note claims "Saved". Calmer pattern: show nothing (or static "Saved") during normal flow and surface only errors / prolonged saving.

C5. Tap targets on the most important interrupt are ~30×21px
"Keep" / "Hand over" are 13px captions with paddingHorizontal: 8, paddingVertical: 4 ([id].tsx:451-454) — far below the 44px minimum. This is the one interaction where a writer must respond under time pressure (20s window) on mobile; mis-taps here hand your pen away. Also §5 says the button system is "intentionally undefined — ask the human" before inventing interactive patterns; these were invented.

C6. Title input invents a type-scale value
titleInput is 28px / 700 / −0.6 ([id].tsx:459-467). The §3 scale defines page title as 30px / 700 / −0.8; 28/−0.6 exists nowhere in the scale, and the doc's preamble says "If a value isn't defined here, ask before inventing one."

C7. Auto-acquire on open is noisy and possessive
Opening a shared note with edit permission silently takes the pen (useFileSync.ts:722-740), broadcasting "X is now editing" to every viewer and locking out the owner — even if you only opened the note to read it. The calmer, brand-consistent model already exists in the UI: the "Tap to edit" pill. Acquire-on-intent (first tap/keystroke) for shared notes — keeping auto-acquire only for your own un-shared notes, which is the DESIGN §4.1 speed case — would eliminate phantom locks and the false "is now editing" notices. (AGENTS.md mandates current behaviour, so this is a flagged product-decision conflict, per the CLAUDE.md rule about surfacing DESIGN/AGENTS tension.)

C8. Viewers can't select or copy the title
The invisible TouchableOpacity overlay ([id].tsx:317-323) swallows every touch on the title for non-editors. For an app whose growth loop is "recipient reads a note," recipients being unable to copy the title (e.g. a recipe name) is a small but real wall.

C9. Hardcoded hex inside both editors' CSS
The ProseMirror style blocks (MarkdownEditorWeb.tsx:17-35, tiptapEditorHtml.ts:31-73) hardcode #1A1A1A, #9E9890, #FAFAF8, #D4D4D2, #E8E8E6, #B4B6BB. The WebView/CSS boundary is a fair technical excuse, but the §12 checklist is absolute ("no hardcoded hex anywhere"), and there are already two diverging copies. Generating both style blocks from theme/colors.ts keeps the single source of truth honest.

C10. Minor polish nits
Two independently-scrolling toolbar rows (MarkdownToolbar.tsx:65-87) with 4 buttons stranded in row 2 — feels unfinished; the actions fit one scrollable row.
Presence pill shadow (opacity 0.10, radius 8, elevation 4, [id].tsx:493-497) sits above every non-FAB value in the §6 table, plus a 1px border — heavier than the "whisper" spec.
editorMinHeight = windowHeight - 300 magic number ([id].tsx:76) + KeyboardAvoidingView behavior="height" on Android with offset 0 — approximate math the comment itself admits; produces content jumps with the keyboard up on small screens.
Timeout copy "No response — try again later" is fine, but the requester's 20s wait shows a static banner with no countdown/cancel — you can't withdraw a request.
What's genuinely good (for balance)
The singleton Supabase client (lib/supabase.ts) is a correct, well-reasoned fix for the multi-socket problem.
Presence-as-soft-lock with pen-released fast-path broadcasts is the right architecture for the free-tier constraint, and the invariant comments in the hook are excellent.
Permission gating is enforced at every layer (UI tap handler, acquire(), save(), RLS) — proper defence in depth.
Loading/error/empty states comply with §8/§9 (ActivityIndicator in icon colour, plain ink-muted text, no skeletons).
Suggested priority order (when fixes are requested)
A1 title reversion (data loss) + A3 unawaited flush — same handover surgery.
A4 save-error recovery — re-fetch + version re-sync instead of dead-end error.
B1/B2 broadcast cost — skip-if-unchanged, include title in payload (also fixes A1's mirror half), reconsider throttle.
B9/B10/B11 RLS cleanup migration — drop 0002 duplicates, add indexes, wrap requesting_user_id().
A2 toolbar link button, C1 blue fallback, C2 press feedback, C5 tap targets — small, high-visibility.
B4 bundle TipTap locally — removes CDN dependency, biggest single win for native open-speed.
C3/C4 banner overlay + save-dot calm-down — the aesthetic-level polish pass.
B5 publication column list, B13 centralized auth refresh, A6 seen_at, C7 auto-acquire decision (needs your call — AGENTS.md mandates current behaviour).
User decision (2026-06-10): B8 is explicitly deferred. Keep all LOG / console.log output in useFileSync untouched for now — the user wants the firehose visible for debugging during this phase. Do not gate behind __DEV__, do not strip. Revisit at a later stage.

Verification (for whichever fixes proceed)
Two-browser (or browser + device) session on one note: rename title → hand over → confirm title survives the new holder's first save; check no "Couldn't save" after handover.
Type continuously for 60s with a viewer attached; watch the network panel for broadcast payload sizes and files UPDATE frequency; confirm viewer CPU stays flat.
explain analyze a files SELECT as a shared user before/after the RLS migration.
Native cold-open in airplane mode after first use (TipTap bundling).# Slate — Live-Editing Audit Report

**Scope:** `hooks/useFileSync.ts`, `app/(app)/note/[id].tsx`, both editor components, the WebView payload, the realtime/RLS backend, and the note screen's UX vs `APP_AESTHETIC.md` / `DESIGN.md`.
**Context:** Audit of the walkie-talkie editing engine for speed bottlenecks, compute/bandwidth cost, implementation flaws, and aesthetic-doc violations. This is a findings report — no fixes applied.

---

## A. Correctness bugs (found while tracing the flows)

### A1. Title can be reverted on pen handover — data loss ⚠️ HIGHEST
The `content` broadcast carries only `{ html, version }` (`useFileSync.ts:254-258`), and the `grant` handler re-fetches only `version` (`useFileSync.ts:606`). Titles are never mirrored. Sequence:
1. A opens note (title "Draft"), B opens note. B's `titleRef = "Draft"`.
2. A renames to "Final", autosaves. B's `titleRef` is still "Draft".
3. A hands the pen to B. B types one character → first save UPDATEs `title: titleRef.current` = **"Draft"** — A's rename is silently destroyed.
Same path makes viewers see a stale title for the whole session (content mirrors live, title doesn't).

### A2. Toolbar link button inserts a blockquote
`MarkdownToolbar.tsx:35` — the `Link2` icon dispatches `action: 'quote'`. There is no `'link'` action anywhere in the pipeline. Two adjacent buttons do the same thing; the advertised link feature doesn't exist.

### A3. Handover version race — `flushSave()` is not awaited
`acceptRequest()` (`useFileSync.ts:404-431`) calls `flushSave()` (fire-and-forget async), then immediately broadcasts `content` with `versionRef.current` — which hasn't been incremented yet because the save is still in flight. The grant-side DB re-fetch (`useFileSync.ts:606`) can also race the in-flight save and read the pre-save version. Result: the new holder's first save can hit a version conflict → permanent "Couldn't save" (see A4). `flushSave` should be `async` and awaited before the content/grant broadcasts.

### A4. Save errors are a dead end
On any 0-rows-updated result (`useFileSync.ts:177-201`), the hook runs a *diagnostic* fetch (an extra round-trip whose only output is a console log) and sets `saveStatus = 'error'`. There is no recovery: no re-fetch of the DB row, no version re-sync, no retry. A single transient conflict leaves the writer staring at "Couldn't save" while continuing to type into a note that will never save again until reopen.

### A5. Unmount broadcasts may never leave the socket
The cleanup (`useFileSync.ts:680-712`) fires `content` + `pen-released` sends, then immediately `removeChannel(ch)` in a void IIFE. `ch.send()` is async; closing the channel right behind it means the "instant pen-free" signal the whole design leans on can be silently dropped — viewers fall back to multi-second Presence GC, exactly the lag the broadcast was added to avoid.

### A6. `seen_at` unread tracking is dead code
`0006_beta_features.sql:7` comments "set to now() by useFileSync when a shared note is first loaded" — no code anywhere writes `seen_at` (grep confirms; ROADMAP.md:202 still unchecked). Either the migration comment is wrong or the feature was never wired. Shared-note "new" badges will never clear.

---

## B. Performance & cost bottlenecks

### Frontend

### B1. Full-document broadcast every 200ms — the big one
`scheduleBroadcast` (`useFileSync.ts:247-261`) ships the **entire HTML document** up to 5×/sec while typing. For DESIGN's own "long note ≈ 10–15 KB": ~50–75 KB/s upstream from the writer, × every viewer downstream, for the duration of typing. This is the dominant realtime cost and burns straight into the Supabase free-tier message/bandwidth quotas the whole §9 cost model depends on. Even without going full-delta, "skip if unchanged" + a longer throttle for large docs would cut this dramatically.

### B2. Viewer-side cost: full ProseMirror re-parse per broadcast
Every received broadcast → `applyRemoteContent` → `setContentState` → editor `setContent(html)`:
- Web: `MarkdownEditorWeb.tsx:103-107` re-parses the whole document into ProseMirror up to 5×/sec.
- Native is worse: `MarkdownEditorNative.tsx:46-51` does `injectJavaScript("window.setContent(<entire doc as JSON string>)")` 5×/sec — string-serialising the document across the RN↔WebView bridge each time, then a full TipTap re-parse inside the WebView. O(doc size) CPU on every viewer device, continuously.

### B3. Every keystroke re-renders the entire note screen
The hook keeps `content` in React state and updates it on each editor `onChange` (`useFileSync.ts:269-274`). For the **writer**, the editor is already the source of truth — this state exists only so viewers can mirror — yet every keystroke re-renders `NoteEditor` and its whole subtree: header, `PresenceAvatars`, `MarkdownToolbar` (two ScrollViews rebuilt), pills, banners. Nothing is memoized (`React.memo` absent on toolbar/avatars; `avatarUsers` rebuilt inline each render, `[id].tsx:86-93`). On native, `postHeight()` fires on every update too (`tiptapEditorHtml.ts:124-127` → `setWebViewHeight`, `[id].tsx:351`), so each keystroke additionally triggers a WebView **resize** — one of the most expensive layout operations RN can do.

### B4. Native editor loads TipTap from esm.sh CDN at runtime
`tiptapEditorHtml.ts:92-94` imports `@tiptap/core`, `starter-kit`, and `marked` from a third-party CDN on every WebView init. Consequences: first note-open on native needs a network fetch of an editor framework (directly violates DESIGN §4.1 "opening the app to a writable note should take under a second"); offline = no editor at all; a supply-chain/SPOF dependency on esm.sh; and web (bundled) vs native (CDN) breaks parity in spirit. These libs should be bundled into the app and inlined into the HTML.

### B5. Autosave write amplification through `postgres_changes`
`0004_realtime.sql` added `files` to the realtime publication, so **every 700ms-debounced save ships the full row — including the entire `content` HTML — to every client subscribed to file lists** (home screen, folder views) of every user with access. A typing session = a continuous stream of full-document rows to devices that only need `title/updated_at` for a list. This compounds B1: the same content travels twice. Consider a column list on the publication or moving list refresh to lighter signals.

### B6. Per-keystroke `saveStatus` churn
`scheduleSave` (`useFileSync.ts:210-219`) sets `setSaveStatus('saving')` on **every keystroke**, forcing extra renders and the flickering dot described in C4.

### B7. Sequential load waterfall
`load()` (`useFileSync.ts:743-810`) fetches the file, *then* the share row — two serial round-trips before first paint for shared users. Parallelize or fold into one query/RPC. The grant handler similarly blocks pen activation on a DB round-trip (`useFileSync.ts:606`) — acceptable as a deliberate safety trade, but it makes handover feel slower than it needs to.

### B8. `console.log` firehose in production
`LOG` (`useFileSync.ts:124-126`) fires on every presence sync, every received broadcast (≤5×/sec per viewer), every save. RN `console.log` is genuinely expensive, and `CODE_STYLE.md` §7 explicitly bans committed `console.log`. Should be gated behind `__DEV__` (or stripped).

### Backend

### B9. Duplicate permissive RLS policies on `files`
`0002_sharing.sql:25-46` and `0005_share_access.sql:15-48` both create a shared-SELECT and a shared-UPDATE policy with near-identical `exists(select … from shares)` predicates. Permissive policies are OR'd — **both run on every files query**, doubling the subquery work. 0005 looks like a rewrite of 0002 that forgot to drop the originals. (0005's versions also add `is_public` and a `with check`, so the pairs aren't even identical — two sources of truth.)

### B10. No indexes behind the RLS subqueries
No migration creates indexes on `shares(resource_type, resource_id, shared_with)`, `shares(shared_with)`, `files(owner_id)`, `files(folder_id)`, or `shares(owner_id)`. Every RLS check on `files` runs the `exists` subquery (×2, per B9) against an unindexed `shares` table — sequential scans on the hottest path in the app (every load, every 700ms autosave). Fine at 10 rows; a real cost cliff as shares grow.

### B11. `requesting_user_id()` evaluated per row in policies
All policies call `requesting_user_id()` bare. Supabase/Postgres best practice is `(select requesting_user_id())` so it's evaluated once per statement (InitPlan) instead of potentially per row. Cheap to fix in one migration; compounds with B9/B10.

### B12. `profiles` email exposure contradicts the earlier design
`0002` built `find_profile_by_email` as `security definer` specifically so profile emails were never exposed ("never the email"). `0005:67-69` then opened SELECT on **all profiles including email** to any authenticated user — a scrapeable email directory. The 0005 comment acknowledges it; flagging that this contradicts the deliberate 0002 design and should be narrowed (column-level grant or a profiles view without email) before any public beta.

### B13. Redundant 50s auth-refresh interval per hook instance
The `setInterval(setAuth)` (`useFileSync.ts:667-669`) is per-mounted-hook. Any other realtime hook doing the same (and the singleton client makes this global anyway) duplicates Clerk token fetches. Belongs once in `lib/supabase.ts`, not in every hook.

### Code health (smaller)

- **Dead/misleading bits:** load-effect deps include `save` which it never uses (`useFileSync.ts:810`); `[id].tsx:27` comment claims Metro `.web.tsx`/`.native.tsx` resolution but the files don't use platform extensions (the conditional `require` is what actually does the work).
- **Triplicated editor logic:** `ToolbarAction` type defined twice (`MarkdownToolbar.tsx:8`, `MarkdownEditorWeb.tsx:40`); the `execCommand` if-chain exists in `MarkdownEditorWeb.tsx:84-95` AND `tiptapEditorHtml.ts:159-172`; the ProseMirror CSS block is fully duplicated between `MarkdownEditorWeb.tsx:17-35` and `tiptapEditorHtml.ts:31-73` (already drifted: native has the placeholder rule, web doesn't). One source should generate all of these.
- **Tiebreak loser's keystrokes silently lost** — known edge of the design; worth a one-line "Someone else started editing" notice when yielding rather than a silent revert.

---

## C. UX/UI vs APP_AESTHETIC.md & DESIGN.md

### C1. Non-palette blue hardcoded in the hook
`FALLBACK_COLOR = '#4A87D6'` (`useFileSync.ts:44`). APP_AESTHETIC §2: "No blue… If a colour use isn't in the table above, it does not ship," and avatar colours must come from the per-user palette. The fallback should come from `theme/avatarColors`. This is the single clearest token violation in the feature.

### C2. Zero press feedback on header actions
Share and Done buttons use `activeOpacity={1}` (`[id].tsx:228, 238`) — no feedback at all, while the back button correctly uses 0.65. §5 defines press states as clean opacity fades; a dead-feeling tap reads as broken, the opposite of premium. (Also: the invisible title overlay at `[id].tsx:317-323` has `activeOpacity={0.65}` — a fade on an invisible element, i.e. still no visible feedback.)

### C3. Banner stack reflows the writing surface
Offline strip, edit-request banner, requester feedback, and "X is now editing" all render as stacked full-width strips **above the content** (`[id].tsx:249-293`), pushing the title and editor down when they appear/disappear. For a "meditative, unhurried" product, the text you're reading/writing jumping 40px because someone opened the note is the most aesthetic-hostile behaviour on the screen. Ambient notices and the request banner should float/overlay (like the presence pill already does) rather than reflow. Related: all four use the identical `editRequestBanner` style — the one *actionable* interrupt (Hand over / Keep) has the same visual weight as ignorable ambient noise, muddying the hierarchy the AGENTS.md presence-UX table implies.

### C4. The save dot flickers on every keystroke
Each keystroke flips the dot to grey "Saving…" (`scheduleSave`) and back to green 700ms+ later — a constant blink right under the title while writing. §8: "the content IS the feedback"; a status light strobing during normal typing is gamified anxiety, not calm. Also `'idle'` maps to green "Saved" (`[id].tsx:160-172`), so a freshly opened, never-saved note claims "Saved". Calmer pattern: show nothing (or static "Saved") during normal flow and surface only errors / prolonged saving.

### C5. Tap targets on the most important interrupt are ~30×21px
"Keep" / "Hand over" are 13px captions with `paddingHorizontal: 8, paddingVertical: 4` (`[id].tsx:451-454`) — far below the 44px minimum. This is the one interaction where a writer must respond under time pressure (20s window) on mobile; mis-taps here hand your pen away. Also §5 says the button system is "intentionally undefined — ask the human" before inventing interactive patterns; these were invented.

### C6. Title input invents a type-scale value
`titleInput` is 28px / 700 / −0.6 (`[id].tsx:459-467`). The §3 scale defines page title as **30px / 700 / −0.8**; 28/−0.6 exists nowhere in the scale, and the doc's preamble says "If a value isn't defined here, ask before inventing one."

### C7. Auto-acquire on open is noisy and possessive
Opening a shared note with edit permission silently takes the pen (`useFileSync.ts:722-740`), broadcasting "X is now editing" to every viewer and locking out the owner — even if you only opened the note to *read* it. The calmer, brand-consistent model already exists in the UI: the "Tap to edit" pill. Acquire-on-intent (first tap/keystroke) for shared notes — keeping auto-acquire only for your own un-shared notes, which is the DESIGN §4.1 speed case — would eliminate phantom locks and the false "is now editing" notices. (AGENTS.md mandates current behaviour, so this is a flagged product-decision conflict, per the CLAUDE.md rule about surfacing DESIGN/AGENTS tension.)

### C8. Viewers can't select or copy the title
The invisible `TouchableOpacity` overlay (`[id].tsx:317-323`) swallows every touch on the title for non-editors. For an app whose growth loop is "recipient reads a note," recipients being unable to copy the title (e.g. a recipe name) is a small but real wall.

### C9. Hardcoded hex inside both editors' CSS
The ProseMirror style blocks (`MarkdownEditorWeb.tsx:17-35`, `tiptapEditorHtml.ts:31-73`) hardcode `#1A1A1A`, `#9E9890`, `#FAFAF8`, `#D4D4D2`, `#E8E8E6`, `#B4B6BB`. The WebView/CSS boundary is a fair technical excuse, but the §12 checklist is absolute ("no hardcoded hex anywhere"), and there are already two diverging copies. Generating both style blocks from `theme/colors.ts` keeps the single source of truth honest.

### C10. Minor polish nits
- Two independently-scrolling toolbar rows (`MarkdownToolbar.tsx:65-87`) with 4 buttons stranded in row 2 — feels unfinished; the actions fit one scrollable row.
- Presence pill shadow (`opacity 0.10, radius 8, elevation 4`, `[id].tsx:493-497`) sits above every non-FAB value in the §6 table, plus a 1px border — heavier than the "whisper" spec.
- `editorMinHeight = windowHeight - 300` magic number (`[id].tsx:76`) + `KeyboardAvoidingView behavior="height"` on Android with offset 0 — approximate math the comment itself admits; produces content jumps with the keyboard up on small screens.
- Timeout copy "No response — try again later" is fine, but the requester's 20s wait shows a static banner with no countdown/cancel — you can't withdraw a request.

### What's genuinely good (for balance)
- The singleton Supabase client (`lib/supabase.ts`) is a correct, well-reasoned fix for the multi-socket problem.
- Presence-as-soft-lock with `pen-released` fast-path broadcasts is the right architecture for the free-tier constraint, and the invariant comments in the hook are excellent.
- Permission gating is enforced at every layer (UI tap handler, `acquire()`, `save()`, RLS) — proper defence in depth.
- Loading/error/empty states comply with §8/§9 (ActivityIndicator in `icon` colour, plain ink-muted text, no skeletons).

---

## Suggested priority order (when fixes are requested)

1. **A1 title reversion** (data loss) + **A3 unawaited flush** — same handover surgery.
2. **A4 save-error recovery** — re-fetch + version re-sync instead of dead-end error.
3. **B1/B2 broadcast cost** — skip-if-unchanged, include title in payload (also fixes A1's mirror half), reconsider throttle.
4. **B9/B10/B11 RLS cleanup migration** — drop 0002 duplicates, add indexes, wrap `requesting_user_id()`.
5. **A2 toolbar link button**, **C1 blue fallback**, **C2 press feedback**, **C5 tap targets** — small, high-visibility.
6. **B4 bundle TipTap locally** — removes CDN dependency, biggest single win for native open-speed.
7. **C3/C4 banner overlay + save-dot calm-down** — the aesthetic-level polish pass.
8. **B5 publication column list**, **B13 centralized auth refresh**, **A6 seen_at**, **C7 auto-acquire decision** (needs your call — AGENTS.md mandates current behaviour).

> **User decision (2026-06-10): B8 is explicitly deferred.** Keep all `LOG` / `console.log` output in `useFileSync` untouched for now — the user wants the firehose visible for debugging during this phase. Do not gate behind `__DEV__`, do not strip. Revisit at a later stage.

## Verification (for whichever fixes proceed)
- Two-browser (or browser + device) session on one note: rename title → hand over → confirm title survives the new holder's first save; check no "Couldn't save" after handover.
- Type continuously for 60s with a viewer attached; watch the network panel for broadcast payload sizes and `files` UPDATE frequency; confirm viewer CPU stays flat.
- `explain analyze` a `files` SELECT as a shared user before/after the RLS migration.
- Native cold-open in airplane mode after first use (TipTap bundling).
