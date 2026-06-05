// Types matching supabase/migrations/0001_init.sql

export type Profile = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  color: string // identity colour (see theme/avatarColors.ts) — added in 0003_profile_colour.sql
  created_at: string
}

export type Folder = {
  id: string
  owner_id: string
  parent_folder_id: string | null
  name: string
  created_at: string
  updated_at: string
}

export type File = {
  id: string
  owner_id: string
  folder_id: string | null
  title: string
  content: string
  updated_by: string | null
  version: number
  yjs_state: Uint8Array | null
  is_public: boolean
  public_slug: string | null
  created_at: string
  updated_at: string
}

export type Share = {
  id: string
  resource_type: 'file' | 'folder'
  resource_id: string
  owner_id: string
  shared_with: string | null
  invited_email: string | null
  permission: 'view' | 'edit'
  created_at: string
}
