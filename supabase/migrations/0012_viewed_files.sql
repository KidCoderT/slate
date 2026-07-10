-- 0012_viewed_files.sql — per-user bookmarks of public notes opened via link.
--
-- A public note's opener already has read access via files.is_public; this table is a
-- BOOKMARK LOG (so the note reappears in their workspace), NOT an access grant — which
-- is why it is separate from `shares` (keeps the owner's grantee list free of every
-- person who ever opened the link). Signed-out openers write nothing.
--
-- MANUAL STEP: run this in the Supabase SQL editor.

create table viewed_files (
  user_id   text not null references profiles(id) on delete cascade,
  file_id   uuid not null references files(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, file_id)
);

alter table viewed_files enable row level security;

-- A user reads and manages only their own bookmark rows. (requesting_user_id() =
-- Clerk sub claim — the repo-wide RLS helper from 0001, not Supabase auth.uid().)
create policy "viewed: self select"
  on viewed_files for select
  using (user_id = requesting_user_id());

create policy "viewed: self insert"
  on viewed_files for insert
  with check (user_id = requesting_user_id());

create policy "viewed: self delete"
  on viewed_files for delete
  using (user_id = requesting_user_id());
