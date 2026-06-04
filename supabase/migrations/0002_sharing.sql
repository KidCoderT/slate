-- 0002_sharing.sql — file-level sharing: email lookup, recipient access, invite claiming.
-- File-level shares only. Folder-share inheritance is deferred (see TODO below).

-- a. Email → account lookup (security definer).
--    Lets an owner detect whether an email already has an account WITHOUT exposing
--    the profiles table (RLS on profiles stays "select own row only"). Returns a
--    minimal projection — never the email or created_at.
create or replace function find_profile_by_email(p_email text)
returns table (id text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select id, display_name, avatar_url
  from profiles
  where email = lower(p_email)
$$;

grant execute on function find_profile_by_email(text) to authenticated;

-- b. Widen files RLS so shared users can read / edit.
--    These are PERMISSIVE policies — they OR with the existing "files: owner full
--    access" policy. Owners keep full access; insert/delete stay owner-only.
create policy "files: shared can select"
  on files for select
  using (
    exists (
      select 1 from shares s
      where s.resource_type = 'file'
        and s.resource_id = files.id
        and s.shared_with = requesting_user_id()
    )
  );

create policy "files: editors can update"
  on files for update
  using (
    exists (
      select 1 from shares s
      where s.resource_type = 'file'
        and s.resource_id = files.id
        and s.shared_with = requesting_user_id()
        and s.permission = 'edit'
    )
  );

-- TODO: folder-share inheritance — a share on a folder should grant access to the
-- files inside it. Deferred; this migration handles direct file shares only.

-- c. Recipients can read the share rows that target them (permission checks,
--    "shared with me"). Owners already read their own shares via the owner policy.
create policy "shares: recipient can select"
  on shares for select
  using (shared_with = requesting_user_id());

-- d. Claim pending invites on sign-in (security definer).
--    When someone is invited by email before they have an account, the share row
--    carries invited_email with shared_with = null. After they sign up, the client
--    calls this once to link those invites to their new account.
create or replace function claim_pending_shares()
returns void
language sql
security definer
set search_path = public
as $$
  update shares
  set shared_with = requesting_user_id()
  where shared_with is null
    and lower(invited_email) = (
      select lower(email) from profiles where id = requesting_user_id()
    )
$$;

grant execute on function claim_pending_shares() to authenticated;
