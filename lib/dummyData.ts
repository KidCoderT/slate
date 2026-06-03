/**
 * Dummy data that mirrors the live DB schema (0001_init.sql).
 * Every field maps 1-to-1 to a real column.
 *
 * Folder depth: max 1 level (root → child). Matches AGENTS.md spec.
 * Profile IDs: Clerk text format  ("user_…")
 * All other IDs: v4 UUID strings
 *
 * Replace calls to these exports with real Supabase queries
 * once hooks (useFiles, useFolders, useShares) are wired up.
 */

import type { File, Folder, Profile, Share } from '@/types/db'

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const OWNER: Profile = {
  id:           'user_2NkX8mTq4pLr9vA3wJ5h',   // Clerk-style text ID
  email:        'sunil@example.com',
  display_name: 'Sunil Tejas',
  avatar_url:   null,
  created_at:   '2026-05-01T09:00:00.000Z',
}

export const COLLABORATOR: Profile = {
  id:           'user_7Yx3mPq2nKrT4vB8wK6z',
  email:        'maya@example.com',
  display_name: 'Maya Sharma',
  avatar_url:   null,
  created_at:   '2026-05-03T14:22:00.000Z',
}

export const DUMMY_PROFILES: Profile[] = [OWNER, COLLABORATOR]

// ─── Folder IDs (exported so screens can reference them without magic strings) ─

export const FOLDER_IDS = {
  workNotes: '3f8a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c',
  personal:  '8c9d0e1f-2a3b-4c5d-6e7f-8a9b0c1d2e3f',
  archive:   'e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b',
} as const

// ─── Folders ──────────────────────────────────────────────────────────────────

export const DUMMY_FOLDERS: Folder[] = [
  // ── Root folders ────────────────────────────────────────────
  {
    id:               FOLDER_IDS.workNotes,
    owner_id:         OWNER.id,
    parent_folder_id: null,
    name:             'Work Notes',
    created_at:       '2026-05-01T10:05:00.000Z',
    updated_at:       '2026-05-28T09:14:00.000Z',
  },
  {
    id:               FOLDER_IDS.personal,
    owner_id:         OWNER.id,
    parent_folder_id: null,
    name:             'Personal',
    created_at:       '2026-05-01T10:07:00.000Z',
    updated_at:       '2026-05-25T20:11:00.000Z',
  },
  {
    id:               FOLDER_IDS.archive,
    owner_id:         OWNER.id,
    parent_folder_id: null,
    name:             'Archive',
    created_at:       '2026-05-01T10:10:00.000Z',
    updated_at:       '2026-05-12T07:55:00.000Z',
  },

]

// ─── File IDs ─────────────────────────────────────────────────────────────────

export const FILE_IDS = {
  // Root level
  draftEssay:       'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  groceryList:      'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
  // Work Notes
  teamIntro:        'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
  sprintRetro:      'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c',
  q3Goals:          '17283940-a5b6-c7d8-e9f0-1a2b3c4d5e6f',
  budgetOverview:   '28394051-b6c7-d8e9-f0a1-2b3c4d5e6f7a',
  // Personal
  recipeCollection: '394a5b6c-7d8e-9f0a-1b2c-3d4e5f6a7b8c',
  japanItinerary:   '4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d',
  packingList:      '5b6c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d0e',
  // Archive
  oldProjectNotes:  '6c7d8e9f-0a1b-2c3d-4e5f-6a7b8c9d0e1f',
} as const

// ─── Files ────────────────────────────────────────────────────────────────────

export const DUMMY_FILES: File[] = [

  // ── Root level (no folder) ──────────────────────────────────
  {
    id:          FILE_IDS.draftEssay,
    owner_id:    OWNER.id,
    folder_id:   null,
    title:       'Draft Essay',
    content:     `# Draft Essay\n\nOpening paragraph ideas. Start with the question, not the answer. Let the reader in slowly.\n\n## The premise\n\nSomething about how we share information has fundamentally changed, yet the tools we use haven't caught up.\n\n## Structure\n\n1. Open with a question\n2. Establish the gap\n3. Propose the reframe\n4. Close with a provocation\n\n## Notes to self\n\n> Don't over-explain. Trust the reader.`,
    updated_by:  OWNER.id,
    version:     3,
    yjs_state:   null,
    is_public:   false,
    public_slug: null,
    created_at:  '2026-05-20T21:00:00.000Z',
    updated_at:  '2026-05-31T22:14:00.000Z',
  },
  {
    id:          FILE_IDS.groceryList,
    owner_id:    OWNER.id,
    folder_id:   null,
    title:       'Grocery List',
    content:     `# Grocery List\n\n- [x] Eggs\n- [ ] Whole milk\n- [x] Sourdough bread\n- [ ] Olive oil (extra virgin)\n- [ ] Cherry tomatoes\n- [ ] Fresh basil\n- [ ] Parmesan\n- [ ] Garlic\n- [ ] Lemons\n- [ ] Unsalted butter`,
    updated_by:  OWNER.id,
    version:     5,
    yjs_state:   null,
    is_public:   true,
    public_slug: 'grocery-f3k9p',     // viewable at /s/grocery-f3k9p
    created_at:  '2026-06-01T08:00:00.000Z',
    updated_at:  '2026-06-01T18:30:00.000Z',
  },

  // ── Work Notes ──────────────────────────────────────────────
  {
    id:          FILE_IDS.teamIntro,
    owner_id:    OWNER.id,
    folder_id:   FOLDER_IDS.workNotes,
    title:       'Team Intro Doc',
    content:     `# Team Intro\n\nWelcome to the team. Here's everything you need to get started.\n\n## Tools we use\n\n- **Slack** — async comms, keep threads tight\n- **Linear** — task tracking and sprint planning\n- **Slate** — shared notes and lightweight docs\n- **Figma** — design and prototyping\n\n## Who's who\n\n| Name | Role |\n|---|---|\n| Sunil | Product |\n| Maya | Engineering |\n\n## Your first week\n\n1. Set up your local dev environment (see \`SETUP.md\`)\n2. Read the product brief in Slate\n3. Attend the Monday planning sync\n4. Ship something small — even a bug fix counts`,
    updated_by:  OWNER.id,
    version:     2,
    yjs_state:   null,
    is_public:   false,
    public_slug: null,
    created_at:  '2026-05-05T10:00:00.000Z',
    updated_at:  '2026-05-28T09:14:00.000Z',
  },
  {
    id:          FILE_IDS.sprintRetro,
    owner_id:    OWNER.id,
    folder_id:   FOLDER_IDS.workNotes,
    title:       'Sprint Retrospective',
    content:     `# Sprint 4 Retrospective\n\n**Date:** 2026-05-23  \n**Team:** Product + Eng  \n**Facilitator:** Sunil\n\n## What went well\n\n- Auth milestone shipped on time\n- Clerk + Supabase integration cleaner than expected\n- Daily standups kept everyone aligned\n- Zero production incidents\n\n## What to improve\n\n- Spec changes mid-sprint caused rework — need to freeze scope at kickoff\n- PR reviews are bottlenecking on Fridays — spread reviews through the week\n- Test coverage on edge cases was thin before merge\n\n## Action items\n\n- [ ] Add scope-lock rule to sprint process doc\n- [ ] Set up test coverage baseline target (80%)\n- [ ] Add Friday review reminder to Slack automation`,
    updated_by:  OWNER.id,
    version:     1,
    yjs_state:   null,
    is_public:   false,
    public_slug: null,
    created_at:  '2026-05-23T17:00:00.000Z',
    updated_at:  '2026-05-23T17:45:00.000Z',
  },

  // ── Q3 Goals + Budget (in Work Notes) ──────────────────────
  {
    id:          FILE_IDS.q3Goals,
    owner_id:    OWNER.id,
    folder_id:   FOLDER_IDS.workNotes,
    title:       'Q3 Goals',
    content:     `# Q3 2026 Goals\n\n## Product\n\n- [ ] Ship note editor (web + mobile, markdown + toolbar)\n- [ ] Sharing flow end-to-end (email invite + public link)\n- [ ] Public viewer page — the growth engine screen\n- [ ] 100 beta users with real sharing activity\n\n## Growth\n\n- [ ] Share → signup conversion funnel instrumented\n- [ ] First 10 organic shares from real users (not team)\n- [ ] Recipient-to-sender conversion rate measured\n\n## Technical\n\n- [ ] RLS policies complete for sharing phase\n- [ ] Realtime sync stable under concurrent edits\n- [ ] Supabase cron ping live (prevent free-tier pause)\n- [ ] Zero known data-loss bugs`,
    updated_by:  OWNER.id,
    version:     4,
    yjs_state:   null,
    is_public:   false,
    public_slug: null,
    created_at:  '2026-05-10T11:35:00.000Z',
    updated_at:  '2026-05-30T16:40:00.000Z',
  },
  {
    id:          FILE_IDS.budgetOverview,
    owner_id:    OWNER.id,
    folder_id:   FOLDER_IDS.workNotes,
    title:       'Budget Overview',
    content:     `# Q3 Budget Overview\n\n## Monthly spend estimate\n\n| Service | Plan | Cost |\n|---|---|---|\n| Supabase | Free tier | $0 |\n| Clerk | Free tier (≤50k MAU) | $0 |\n| Domain | .com registration | ~$1.25/mo |\n| **Total** | | **~$1.25/mo** |\n\n## When costs kick in\n\nSupabase Pro triggers at ~35,000 notes stored (500 MB limit) → **$25/mo flat**. Predictable, not scary.\n\nClerk charges $0.02/user beyond 50k MAU — we're nowhere near that.\n\n## Burn rate\n\nEssentially zero until meaningful scale. Upgrade path is clear and cheap.\n\n## TODO\n\n- [ ] Set up Uptime Robot ping (free) to prevent Supabase free-tier pause`,
    updated_by:  OWNER.id,
    version:     2,
    yjs_state:   null,
    is_public:   false,
    public_slug: null,
    created_at:  '2026-05-12T14:00:00.000Z',
    updated_at:  '2026-05-28T10:20:00.000Z',
  },

  // ── Personal ────────────────────────────────────────────────
  {
    id:          FILE_IDS.recipeCollection,
    owner_id:    OWNER.id,
    folder_id:   FOLDER_IDS.personal,
    title:       'Recipe Collection',
    content:     `# Recipes\n\n## Miso Glazed Salmon\n\n**Marinade** (rest 30 min)\n\n- 2 tbsp white miso paste\n- 1 tbsp mirin\n- 1 tbsp sake\n- 1 tsp sesame oil\n- 1 tsp fresh ginger, grated\n\nBroil on high for 8 min. Serve with sesame bok choy and steamed rice.\n\n---\n\n## One-Pan Pasta\n\nCherry tomatoes, 4 garlic cloves, torn basil, generous olive oil, pasta + just enough water to cover. Simmer 12 min stirring often. Season aggressively.\n\n---\n\n## Overnight Oats\n\n- ½ cup rolled oats\n- ½ cup oat milk\n- 1 tbsp chia seeds\n- Pinch of salt\n\nRefrigerate overnight. Top with honey and berries.`,
    updated_by:  OWNER.id,
    version:     6,
    yjs_state:   null,
    is_public:   false,
    public_slug: null,
    created_at:  '2026-05-08T19:00:00.000Z',
    updated_at:  '2026-05-25T20:11:00.000Z',
  },

  // ── Travel (in Personal) ────────────────────────────────────
  {
    id:          FILE_IDS.japanItinerary,
    owner_id:    OWNER.id,
    folder_id:   FOLDER_IDS.personal,
    title:       'Japan Trip',
    content:     `# Japan — October 2026\n\n## Days 1–3: Tokyo\n\n- Arrive Narita, JR Pass from airport, check in Shinjuku\n- Shibuya crossing + Harajuku takeshita street\n- TeamLab Borderless (book ahead)\n- Ramen at Ichiran — solo booth, no distractions\n- Tsukiji outer market breakfast\n\n## Days 4–5: Kyoto\n\n- Shinkansen Nozomi from Shinagawa (2h 15m)\n- Fushimi Inari at 6am — empty, atmospheric, worth the early start\n- Arashiyama bamboo grove + Tenryu-ji garden\n- Nishiki Market for lunch snacks\n- Philosopher's Path at dusk\n\n## Days 6–7: Osaka\n\n- Dotonbori at night — the neon, the crowds, worth it\n- Takoyaki + okonomiyaki for every meal, no apologies\n- Day trip to Nara: free-roaming deer + Todai-ji temple\n\n## Budget estimate\n\n~¥150,000 all-in (≈ $1,000 USD), excluding flights`,
    updated_by:  OWNER.id,
    version:     3,
    yjs_state:   null,
    is_public:   true,
    public_slug: 'japan-trip-m7n2q', // viewable at /s/japan-trip-m7n2q
    created_at:  '2026-05-15T08:10:00.000Z',
    updated_at:  '2026-05-29T11:22:00.000Z',
  },
  {
    id:          FILE_IDS.packingList,
    owner_id:    OWNER.id,
    folder_id:   FOLDER_IDS.personal,
    title:       'Packing List',
    content:     `# Packing List — Japan (7 days)\n\n## Clothes\n\n- [ ] 5 t-shirts\n- [ ] 2 button shirts (temples can be conservative)\n- [ ] 1 light jacket (Kyoto evenings are cool in October)\n- [ ] 7 underwear / socks\n- [ ] Comfortable walking shoes — you will walk 20,000 steps/day\n- [ ] Slip-ons or sandals (easy removal at temples)\n\n## Tech\n\n- [ ] Phone + charger\n- [ ] Portable battery pack (10,000 mAh minimum)\n- [ ] Japan is type A plug — **no adapter needed** from US/Canada\n- [ ] Pocket WiFi or SIM (rent at airport)\n\n## Documents\n\n- [ ] Passport (valid 6+ months)\n- [ ] Travel insurance confirmation (offline copy)\n- [ ] Hotel confirmations printed or saved offline\n- [ ] JR Pass exchange order\n\n## Cash\n\nJapan is still heavily cash-based. Withdraw yen at 7-Eleven ATMs (they accept foreign cards).`,
    updated_by:  OWNER.id,
    version:     2,
    yjs_state:   null,
    is_public:   false,
    public_slug: null,
    created_at:  '2026-05-16T09:00:00.000Z',
    updated_at:  '2026-05-29T11:25:00.000Z',
  },

  // ── Archive ──────────────────────────────────────────────────
  {
    id:          FILE_IDS.oldProjectNotes,
    owner_id:    OWNER.id,
    folder_id:   FOLDER_IDS.archive,
    title:       'Project X — Archived',
    content:     `# Project X — Archived\n\n> Paused April 2026. Notes kept for reference and learnings.\n\n## What we built\n\nA prototype for async video notes — record a 60-second clip, share a link. Felt clever at the time.\n\n## Why it didn't work\n\n- Video is high-friction to consume (you can't skim it)\n- Sharing UX was confusing — recipients didn't know what they were opening\n- Storage costs at scale were punishing\n- Nobody wanted to watch a video to read a shopping list\n\n## Key learnings (that shaped Slate)\n\n- **Text beats video for quick sharing** — lower friction on both ends\n- The sharing model must be obvious from the first open — no thinking required\n- Mobile-first is non-negotiable for consumer apps in 2026\n- Beautiful defaults matter more than configurability`,
    updated_by:  OWNER.id,
    version:     1,
    yjs_state:   null,
    is_public:   false,
    public_slug: null,
    created_at:  '2026-04-30T18:00:00.000Z',
    updated_at:  '2026-04-30T18:00:00.000Z',
  },
]

// ─── Share IDs ────────────────────────────────────────────────────────────────

export const SHARE_IDS = {
  workNotesFolder: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
  japanItinerary:  'bb22cc33-dd44-ee55-ff66-778899001122',
  draftEssay:      'cc33dd44-ee55-ff66-7788-99001122334455'.slice(0, 36),
} as const

// ─── Shares ───────────────────────────────────────────────────────────────────

export const DUMMY_SHARES: Share[] = [
  // Work Notes folder → Maya (edit access, she's signed up)
  {
    id:            SHARE_IDS.workNotesFolder,
    resource_type: 'folder',
    resource_id:   FOLDER_IDS.workNotes,
    owner_id:      OWNER.id,
    shared_with:   COLLABORATOR.id,
    invited_email: COLLABORATOR.email,
    permission:    'edit',
    created_at:    '2026-05-06T10:00:00.000Z',
  },
  // Japan itinerary → friend@example.com (view, invite pending — no account yet)
  {
    id:            SHARE_IDS.japanItinerary,
    resource_type: 'file',
    resource_id:   FILE_IDS.japanItinerary,
    owner_id:      OWNER.id,
    shared_with:   null,
    invited_email: 'friend@example.com',
    permission:    'view',
    created_at:    '2026-05-29T11:30:00.000Z',
  },
  // Draft essay → Maya (view only)
  {
    id:            SHARE_IDS.draftEssay,
    resource_type: 'file',
    resource_id:   FILE_IDS.draftEssay,
    owner_id:      OWNER.id,
    shared_with:   COLLABORATOR.id,
    invited_email: COLLABORATOR.email,
    permission:    'view',
    created_at:    '2026-05-31T22:20:00.000Z',
  },
]

// ─── Query helpers (mirrors what real hooks will return) ──────────────────────

export type Breadcrumb = { id: string | null; name: string }

/**
 * Walks the parent chain from folderId to root and returns
 * an ordered array of breadcrumbs, always starting with Home.
 *
 * Example for Q3 Planning (child of Work Notes):
 *   [{ id: null, name: 'Home' }, { id: '<workNotes>', name: 'Work Notes' }, { id: '<q3Planning>', name: 'Q3 Planning' }]
 */
export function buildBreadcrumbs(folderId: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = []
  let current = getFolderById(folderId)
  while (current) {
    crumbs.unshift({ id: current.id, name: current.name })
    current = current.parent_folder_id
      ? getFolderById(current.parent_folder_id)
      : undefined
  }
  crumbs.unshift({ id: null, name: 'Home' })
  return crumbs
}

/** Folders with no parent — shown at root level on the home screen */
export function getRootFolders(): Folder[] {
  return DUMMY_FOLDERS.filter(f => f.parent_folder_id === null)
}

/** Direct children of a given folder */
export function getSubfolders(parentId: string): Folder[] {
  return DUMMY_FOLDERS.filter(f => f.parent_folder_id === parentId)
}

/** Files directly inside a folder (does not recurse into subfolders) */
export function getFilesInFolder(folderId: string): File[] {
  return DUMMY_FILES.filter(f => f.folder_id === folderId)
}

/** Files at root level (not in any folder) */
export function getRootFiles(): File[] {
  return DUMMY_FILES.filter(f => f.folder_id === null)
}

export function getFolderById(id: string): Folder | undefined {
  return DUMMY_FOLDERS.find(f => f.id === id)
}

export function getFileById(id: string): File | undefined {
  return DUMMY_FILES.find(f => f.id === id)
}

export function getSharesForResource(type: 'file' | 'folder', resourceId: string): Share[] {
  return DUMMY_SHARES.filter(
    s => s.resource_type === type && s.resource_id === resourceId,
  )
}

/** Note count for a folder. Folders are flat in v1 — direct files only. */
export function countFilesInFolder(folderId: string): number {
  return DUMMY_FILES.filter(f => f.folder_id === folderId).length
}

/**
 * Returns the first meaningful line of a markdown note as a preview string.
 * Strips the H1 title, blank lines, markdown symbols, and checkbox syntax.
 */
export function getPreview(content: string): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const stripped = line
      .replace(/^#{1,6}\s+/, '')        // remove heading markers
      .replace(/^[-*+]\s+(\[.\]\s*)?/, '') // remove list markers + checkboxes
      .replace(/^\|.*\|.*$/, '')          // skip table rows
      .replace(/^>\s*/, '')               // remove blockquotes
      .replace(/\*\*(.*?)\*\*/g, '$1')   // unwrap bold
      .replace(/\*(.*?)\*/g, '$1')        // unwrap italic
      .replace(/`([^`]+)`/g, '$1')        // unwrap inline code
      .trim()
    if (stripped.length > 0) return stripped
  }
  return ''
}

/**
 * Human-readable relative time from an ISO timestamp.
 * e.g. "2h ago", "3d ago", "just now"
 */
export function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  <  1) return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  <  7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
