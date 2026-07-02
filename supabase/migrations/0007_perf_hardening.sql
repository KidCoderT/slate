-- 0007_perf_hardening.sql — RLS dedupe + per-statement auth + indexes + seen_at wiring
-- + realtime publication slimming. (Audit items B9, B10, B11, A6, B5.)
--
-- MANUAL STEP: run this in the Supabase SQL editor. Requires Postgres 15+ for the
-- publication column list at the bottom (all current Supabase projects qualify).

-- ── B9: drop the 0002 share policies that 0005 superseded ──────────────────────────────
-- Permissive policies OR together, so the near-identical 0002/0005 pairs were BOTH
-- evaluated on every files query. 0005's versions are the keepers (they also cover
-- is_public and carry a WITH CHECK on update).
drop policy if exists "files: shared can select" on files;
drop policy if exists "files: editors can update" on files;
-- Same duplication on shares: 0002's recipient-select == 0005's shared_with-select.
drop policy if exists "shares: recipient can select" on shares;

-- ── B11: wrap requesting_user_id() in (select …) everywhere ────────────────────────────
-- Bare function calls in a policy are evaluated per row; (select fn()) becomes an
-- InitPlan evaluated once per statement. Same semantics, much cheaper on big scans.

-- profiles (0001 + 0005)
alter policy "profiles: select own row" on profiles
  using ((select requesting_user_id()) = id);
alter policy "profiles: insert own row" on profiles
  with check ((select requesting_user_id()) = id);
alter policy "profiles: update own row" on profiles
  using ((select requesting_user_id()) = id);
alter policy "profiles: any authenticated user can select" on profiles
  using ((select requesting_user_id()) is not null);

-- folders (0001)
alter policy "folders: owner full access" on folders
  using ((select requesting_user_id()) = owner_id)
  with check ((select requesting_user_id()) = owner_id);

-- files (0001 + 0005)
alter policy "files: owner full access" on files
  using ((select requesting_user_id()) = owner_id)
  with check ((select requesting_user_id()) = owner_id);
alter policy "files: shared users and public can select" on files
  using (
    is_public = true
    or exists (
      select 1 from shares
      where shares.resource_type = 'file'
        and shares.resource_id = files.id
        and shares.shared_with = (select requesting_user_id())
    )
  );
alter policy "files: shared edit can update" on files
  using (
    exists (
      select 1 from shares
      where shares.resource_type = 'file'
        and shares.resource_id = files.id
        and shares.shared_with = (select requesting_user_id())
        and shares.permission = 'edit'
    )
  )
  with check (
    exists (
      select 1 from shares
      where shares.resource_type = 'file'
        and shares.resource_id = files.id
        and shares.shared_with = (select requesting_user_id())
        and shares.permission = 'edit'
    )
  );

-- shares (0001 + 0005)
alter policy "shares: owner full access" on shares
  using ((select requesting_user_id()) = owner_id)
  with check ((select requesting_user_id()) = owner_id);
alter policy "shares: shared_with can select own rows" on shares
  using (shared_with = (select requesting_user_id()));

-- ── B10: indexes behind the RLS subqueries and list queries ────────────────────────────
-- Every files SELECT/UPDATE runs the exists(shares…) probe above; every home/folder
-- list filters files by owner/folder. All were sequential scans until now.
create index if not exists idx_shares_resource_shared_with
  on shares (resource_type, resource_id, shared_with);
create index if not exists idx_shares_shared_with on shares (shared_with);
create index if not exists idx_shares_owner on shares (owner_id);
create index if not exists idx_files_owner on files (owner_id);
create index if not exists idx_files_folder on files (folder_id);

-- ── A6: wire up shares.seen_at (added in 0006, never written) ──────────────────────────
-- Security definer so recipients can stamp ONLY seen_at on their own share row.
-- (A recipient UPDATE policy on shares would let them rewrite permission too.)
create or replace function mark_share_seen(p_resource_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update shares
  set seen_at = now()
  where resource_type = 'file'
    and resource_id = p_resource_id
    and shared_with = requesting_user_id()
    and seen_at is null
$$;

grant execute on function mark_share_seen(uuid) to authenticated;

-- ── B5: stop shipping note bodies through postgres_changes ─────────────────────────────
-- 0004 published the whole files row, so every autosave pushed the full content HTML to
-- every list subscriber. The list hooks (useFiles / useSharedFiles) only use events as a
-- refetch signal — they never read the payload — so publishing metadata columns only is
-- safe and cuts the per-save fan-out from ~note-size to ~200 bytes.
alter publication supabase_realtime drop table files;
alter publication supabase_realtime add table files
  (id, owner_id, folder_id, title, updated_by, version, is_public, public_slug, created_at, updated_at);
