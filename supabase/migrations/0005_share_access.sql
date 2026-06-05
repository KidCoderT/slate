-- 0005_share_access.sql — RLS policies granting shared users access to files/shares.
--
-- The initial migration (0001) set up owner-only access. Without these policies:
--   • A shared user cannot SELECT the file  → note loads as "not found"
--   • A shared user cannot UPDATE the file  → every save → "Couldn't save" (0 rows)
--   • A shared user cannot SELECT their share row → permission resolves to 'view' always
--
-- Postgres ORs multiple policies for the same operation, so these ADD to the existing
-- owner policies rather than replacing them.
--
-- MANUAL STEP: run this in the Supabase SQL editor.

-- ── files: SELECT ──────────────────────────────────────────────────────────────────────
-- Allow: any user who has a share row pointing at this file, OR public files (is_public).
create policy "files: shared users and public can select"
  on files for select
  using (
    is_public = true
    or exists (
      select 1 from shares
      where shares.resource_type = 'file'
        and shares.resource_id = files.id
        and shares.shared_with = requesting_user_id()
    )
  );

-- ── files: UPDATE ─────────────────────────────────────────────────────────────────────
-- Allow: shared users whose permission = 'edit'. View-only shares still cannot write.
create policy "files: shared edit can update"
  on files for update
  using (
    exists (
      select 1 from shares
      where shares.resource_type = 'file'
        and shares.resource_id = files.id
        and shares.shared_with = requesting_user_id()
        and shares.permission = 'edit'
    )
  )
  with check (
    exists (
      select 1 from shares
      where shares.resource_type = 'file'
        and shares.resource_id = files.id
        and shares.shared_with = requesting_user_id()
        and shares.permission = 'edit'
    )
  );

-- ── shares: SELECT ────────────────────────────────────────────────────────────────────
-- The shared_with user must be able to read their own share row so the hook can resolve
-- whether their permission is 'view' or 'edit'. Without this, the hook always falls back
-- to 'view' even for edit-access users.
create policy "shares: shared_with can select own rows"
  on shares for select
  using (shared_with = requesting_user_id());

-- ── profiles: SELECT ──────────────────────────────────────────────────────────────────
-- Any authenticated user can read profile rows. Profile data (display_name, avatar_url,
-- color) is presentational — needed for presence avatars and ShareSheet collaborator
-- names. The existing "profiles: select own row" policy already covers own-row reads;
-- this broadens it to all authenticated users.
--
-- Note: profile.email is included in the table. This is acceptable for a collaborative
-- app where users explicitly share with named collaborators. Revisit before public launch
-- if a narrower policy (select only profiles of your collaborators) is preferred.
create policy "profiles: any authenticated user can select"
  on profiles for select
  using (requesting_user_id() is not null);
