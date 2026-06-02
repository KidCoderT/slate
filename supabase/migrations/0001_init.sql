-- Helper: extracts the Clerk user ID from the JWT sub claim
-- Use this in all RLS policies instead of auth.uid() (which is Supabase-auth-only)
create or replace function requesting_user_id()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'sub'
$$;

-- profiles: mirror of Clerk users so we can do SQL joins
-- NOTE: id is text, not uuid — Clerk user IDs look like "user_2abc..."
create table profiles (
  id           text primary key,
  email        text not null unique,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles: select own row"
  on profiles for select
  using (requesting_user_id() = id);

create policy "profiles: insert own row"
  on profiles for insert
  with check (requesting_user_id() = id);

create policy "profiles: update own row"
  on profiles for update
  using (requesting_user_id() = id);

-- folders: nested tree structure (parent_folder_id = null means root level)
-- NOTE: AGENTS.md overrides DESIGN.md here — folders ARE nested in this implementation
create table folders (
  id               uuid primary key default gen_random_uuid(),
  owner_id         text not null references profiles(id) on delete cascade,
  parent_folder_id uuid references folders(id) on delete cascade,
  name             text not null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table folders enable row level security;

create policy "folders: owner full access"
  on folders for all
  using (requesting_user_id() = owner_id)
  with check (requesting_user_id() = owner_id);

-- TODO: folder share inheritance — users with share access can read/edit folders

-- files: the notes themselves
create table files (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null references profiles(id) on delete cascade,
  folder_id   uuid references folders(id) on delete set null,
  title       text not null default '',
  content     text not null default '',
  updated_by  text references profiles(id),
  version     integer not null default 1,
  yjs_state   bytea,
  is_public   boolean not null default false,
  public_slug text unique,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table files enable row level security;

create policy "files: owner full access"
  on files for all
  using (requesting_user_id() = owner_id)
  with check (requesting_user_id() = owner_id);

-- TODO: folder share inheritance — users with share access can read/edit files in shared folders

-- shares: handles both file and folder shares in one table
create table shares (
  id            uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('file', 'folder')),
  resource_id   uuid not null,
  owner_id      text not null references profiles(id),
  shared_with   text references profiles(id),
  invited_email text,
  permission    text not null default 'view' check (permission in ('view', 'edit')),
  created_at    timestamptz default now(),
  unique (resource_type, resource_id, invited_email)
);

alter table shares enable row level security;

create policy "shares: owner full access"
  on shares for all
  using (requesting_user_id() = owner_id)
  with check (requesting_user_id() = owner_id);
