-- 0011_fix_recursion.sql — fix infinite recursion in files RLS policy.
--
-- The 0010 policy "files: shared edit can update" checks the pens table directly,
-- which has a policy that checks files → infinite recursion.
--
-- This adds a security-definer helper function to break the cycle.

-- Helper: check if user holds valid pen on a file (security definer to avoid RLS recursion)
create or replace function has_valid_pen(p_file uuid, p_user text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from pens
    where file_id = p_file
      and holder_id = p_user
      and expires_at > now()
  )
$$;

grant execute on function has_valid_pen(uuid, text) to authenticated;

-- Fix the policy: use the helper function instead of direct pens table access
alter policy "files: shared edit can update" on files
  using (
    exists (
      select 1 from shares
      where shares.resource_type = 'file'
        and shares.resource_id = files.id
        and shares.shared_with = (select requesting_user_id())
        and shares.permission = 'edit'
    )
    and has_valid_pen(files.id, (select requesting_user_id()))
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
