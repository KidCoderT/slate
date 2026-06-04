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

export const COLLABORATOR_2: Profile = {
  id:           'user_9Bz4nRq3mLsV5wC7xN8y',
  email:        'ayaan@example.com',
  display_name: 'Ayaan Khan',
  avatar_url:   null,
  created_at:   '2026-05-10T12:00:00.000Z',
}

export const DUMMY_PROFILES: Profile[] = [OWNER, COLLABORATOR, COLLABORATOR_2]

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
    content:     `<h1>Draft Essay</h1><p>Opening paragraph ideas. Start with the question, not the answer. Let the reader in slowly.</p><h2>The premise</h2><p>Something about how we share information has fundamentally changed, yet the tools we use haven't caught up.</p><h2>Structure</h2><ol><li><p>Open with a question</p></li><li><p>Establish the gap</p></li><li><p>Propose the reframe</p></li><li><p>Close with a provocation</p></li></ol><h2>Notes to self</h2><blockquote><p>Don't over-explain. Trust the reader.</p></blockquote>`,
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
    content:     `<h1>Grocery List</h1><ul><li><p>Eggs</p></li><li><p>Whole milk</p></li><li><p>Sourdough bread</p></li><li><p>Olive oil (extra virgin)</p></li><li><p>Cherry tomatoes</p></li><li><p>Fresh basil</p></li><li><p>Parmesan</p></li><li><p>Garlic</p></li><li><p>Lemons</p></li><li><p>Unsalted butter</p></li></ul>`,
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
    content:     `<h1>Team Intro</h1><p>Welcome to the team. Here's everything you need to get started.</p><h2>Tools we use</h2><ul><li><p><strong>Slack</strong> — async comms, keep threads tight</p></li><li><p><strong>Linear</strong> — task tracking and sprint planning</p></li><li><p><strong>Slate</strong> — shared notes and lightweight docs</p></li><li><p><strong>Figma</strong> — design and prototyping</p></li></ul><h2>Who's who</h2><p>Sunil — Product · Maya — Engineering</p><h2>Your first week</h2><ol><li><p>Set up your local dev environment (see <code>SETUP.md</code>)</p></li><li><p>Read the product brief in Slate</p></li><li><p>Attend the Monday planning sync</p></li><li><p>Ship something small — even a bug fix counts</p></li></ol>`,
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
    content:     `<h1>Sprint 4 Retrospective</h1><p><strong>Date:</strong> 2026-05-23<br><strong>Team:</strong> Product + Eng<br><strong>Facilitator:</strong> Sunil</p><h2>What went well</h2><ul><li><p>Auth milestone shipped on time</p></li><li><p>Clerk + Supabase integration cleaner than expected</p></li><li><p>Daily standups kept everyone aligned</p></li><li><p>Zero production incidents</p></li></ul><h2>What to improve</h2><ul><li><p>Spec changes mid-sprint caused rework — need to freeze scope at kickoff</p></li><li><p>PR reviews are bottlenecking on Fridays — spread reviews through the week</p></li><li><p>Test coverage on edge cases was thin before merge</p></li></ul><h2>Action items</h2><ul><li><p>Add scope-lock rule to sprint process doc</p></li><li><p>Set up test coverage baseline target (80%)</p></li><li><p>Add Friday review reminder to Slack automation</p></li></ul>`,
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
    content:     `<h1>Q3 2026 Goals</h1><h2>Product</h2><ul><li><p>Ship note editor (web + mobile, markdown + toolbar)</p></li><li><p>Sharing flow end-to-end (email invite + public link)</p></li><li><p>Public viewer page — the growth engine screen</p></li><li><p>100 beta users with real sharing activity</p></li></ul><h2>Growth</h2><ul><li><p>Share → signup conversion funnel instrumented</p></li><li><p>First 10 organic shares from real users (not team)</p></li><li><p>Recipient-to-sender conversion rate measured</p></li></ul><h2>Technical</h2><ul><li><p>RLS policies complete for sharing phase</p></li><li><p>Realtime sync stable under concurrent edits</p></li><li><p>Supabase cron ping live (prevent free-tier pause)</p></li><li><p>Zero known data-loss bugs</p></li></ul>`,
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
    content:     `<h1>Q3 Budget Overview</h1><h2>Monthly spend estimate</h2><table><thead><tr><th>Service</th><th>Plan</th><th>Cost</th></tr></thead><tbody><tr><td>Supabase</td><td>Free tier</td><td>$0</td></tr><tr><td>Clerk</td><td>Free tier (≤50k MAU)</td><td>$0</td></tr><tr><td>Domain</td><td>.com registration</td><td>~$1.25/mo</td></tr><tr><td><strong>Total</strong></td><td></td><td><strong>~$1.25/mo</strong></td></tr></tbody></table><h2>When costs kick in</h2><p>Supabase Pro triggers at ~35,000 notes stored (500 MB limit) → <strong>$25/mo flat</strong>. Predictable, not scary.</p><p>Clerk charges $0.02/user beyond 50k MAU — we're nowhere near that.</p><h2>Burn rate</h2><p>Essentially zero until meaningful scale. Upgrade path is clear and cheap.</p><h2>TODO</h2><ul><li><p>Set up Uptime Robot ping (free) to prevent Supabase free-tier pause</p></li></ul>`,
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
    content:     `<h1>Recipes</h1><h2>Miso Glazed Salmon</h2><p><strong>Marinade</strong> (rest 30 min)</p><ul><li><p>2 tbsp white miso paste</p></li><li><p>1 tbsp mirin</p></li><li><p>1 tbsp sake</p></li><li><p>1 tsp sesame oil</p></li><li><p>1 tsp fresh ginger, grated</p></li></ul><p>Broil on high for 8 min. Serve with sesame bok choy and steamed rice.</p><hr><h2>One-Pan Pasta</h2><p>Cherry tomatoes, 4 garlic cloves, torn basil, generous olive oil, pasta + just enough water to cover. Simmer 12 min stirring often. Season aggressively.</p><hr><h2>Overnight Oats</h2><ul><li><p>½ cup rolled oats</p></li><li><p>½ cup oat milk</p></li><li><p>1 tbsp chia seeds</p></li><li><p>Pinch of salt</p></li></ul><p>Refrigerate overnight. Top with honey and berries.</p>`,
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
    content:     `<h1>Japan — October 2026</h1><h2>Days 1–3: Tokyo</h2><ul><li><p>Arrive Narita, JR Pass from airport, check in Shinjuku</p></li><li><p>Shibuya crossing + Harajuku takeshita street</p></li><li><p>TeamLab Borderless (book ahead)</p></li><li><p>Ramen at Ichiran — solo booth, no distractions</p></li><li><p>Tsukiji outer market breakfast</p></li></ul><h2>Days 4–5: Kyoto</h2><ul><li><p>Shinkansen Nozomi from Shinagawa (2h 15m)</p></li><li><p>Fushimi Inari at 6am — empty, atmospheric, worth the early start</p></li><li><p>Arashiyama bamboo grove + Tenryu-ji garden</p></li><li><p>Nishiki Market for lunch snacks</p></li><li><p>Philosopher's Path at dusk</p></li></ul><h2>Days 6–7: Osaka</h2><ul><li><p>Dotonbori at night — the neon, the crowds, worth it</p></li><li><p>Takoyaki + okonomiyaki for every meal, no apologies</p></li><li><p>Day trip to Nara: free-roaming deer + Todai-ji temple</p></li></ul><h2>Budget estimate</h2><p>~¥150,000 all-in (≈ $1,000 USD), excluding flights</p>`,
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
    content:     `<h1>Packing List — Japan (7 days)</h1><h2>Clothes</h2><ul><li><p>5 t-shirts</p></li><li><p>2 button shirts (temples can be conservative)</p></li><li><p>1 light jacket (Kyoto evenings are cool in October)</p></li><li><p>7 underwear / socks</p></li><li><p>Comfortable walking shoes — you will walk 20,000 steps/day</p></li><li><p>Slip-ons or sandals (easy removal at temples)</p></li></ul><h2>Tech</h2><ul><li><p>Phone + charger</p></li><li><p>Portable battery pack (10,000 mAh minimum)</p></li><li><p>Japan is type A plug — <strong>no adapter needed</strong> from US/Canada</p></li><li><p>Pocket WiFi or SIM (rent at airport)</p></li></ul><h2>Documents</h2><ul><li><p>Passport (valid 6+ months)</p></li><li><p>Travel insurance confirmation (offline copy)</p></li><li><p>Hotel confirmations printed or saved offline</p></li><li><p>JR Pass exchange order</p></li></ul><h2>Cash</h2><p>Japan is still heavily cash-based. Withdraw yen at 7-Eleven ATMs (they accept foreign cards).</p>`,
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
    content:     `<h1>Project X — Archived</h1><blockquote><p>Paused April 2026. Notes kept for reference and learnings.</p></blockquote><h2>What we built</h2><p>A prototype for async video notes — record a 60-second clip, share a link. Felt clever at the time.</p><h2>Why it didn't work</h2><ul><li><p>Video is high-friction to consume (you can't skim it)</p></li><li><p>Sharing UX was confusing — recipients didn't know what they were opening</p></li><li><p>Storage costs at scale were punishing</p></li><li><p>Nobody wanted to watch a video to read a shopping list</p></li></ul><h2>Key learnings (that shaped Slate)</h2><ul><li><p><strong>Text beats video for quick sharing</strong> — lower friction on both ends</p></li><li><p>The sharing model must be obvious from the first open — no thinking required</p></li><li><p>Mobile-first is non-negotiable for consumer apps in 2026</p></li><li><p>Beautiful defaults matter more than configurability</p></li></ul>`,
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
  workNotesFolder:   'aa11bb22-cc33-dd44-ee55-ff6677889900',
  japanItinerary:    'bb22cc33-dd44-ee55-ff66-778899001122',
  draftEssay:        'cc33dd44-ee55-ff66-7788-99001122334455'.slice(0, 36),
  sprintRetroMaya:   'dd44ee55-ff66-7788-9900-112233445566',
  sprintRetroAyaan:  'ee55ff66-7788-9900-1122-334455667788',
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
  // Sprint Retro → Maya (edit)
  {
    id:            SHARE_IDS.sprintRetroMaya,
    resource_type: 'file',
    resource_id:   FILE_IDS.sprintRetro,
    owner_id:      OWNER.id,
    shared_with:   COLLABORATOR.id,
    invited_email: COLLABORATOR.email,
    permission:    'edit',
    created_at:    '2026-05-23T17:50:00.000Z',
  },
  // Sprint Retro → Ayaan (view)
  {
    id:            SHARE_IDS.sprintRetroAyaan,
    resource_type: 'file',
    resource_id:   FILE_IDS.sprintRetro,
    owner_id:      OWNER.id,
    shared_with:   COLLABORATOR_2.id,
    invited_email: COLLABORATOR_2.email,
    permission:    'view',
    created_at:    '2026-05-23T18:00:00.000Z',
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
 * Returns the first ~120 chars of body text from an HTML note as a preview string.
 * Strips the leading h1 (which duplicates the title field) then strips all tags.
 */
export function getPreview(content: string): string {
  const withoutTitle = content.replace(/^<h1[^>]*>.*?<\/h1>/i, '')
  const text = withoutTitle
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 120 ? text.slice(0, 120) + '…' : text
}

export type CollaboratorEntry = {
  profile:    Profile
  permission: 'owner' | 'edit' | 'view'
}

/** Returns owner first, then all share recipients for a given file. */
export function getCollaboratorsForFile(fileId: string): CollaboratorEntry[] {
  const file = getFileById(fileId)
  if (!file) return []

  const result: CollaboratorEntry[] = [{ profile: OWNER, permission: 'owner' }]

  for (const share of getSharesForResource('file', fileId)) {
    const profile = DUMMY_PROFILES.find(
      p => p.id === share.shared_with || p.email === share.invited_email,
    )
    if (profile) {
      result.push({ profile, permission: share.permission as 'edit' | 'view' })
    }
  }

  return result
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
