-- 0010_pen_enforcement.sql — the pen is enforced by the database, not the client.
--
-- Two hardenings:
--   1. Shared editors can UPDATE a file ONLY while holding an unexpired pen.
--      Until now the pen was honour-system: a tampered client with an edit share
--      could write regardless. Owners keep their 0001 full-access policy (a
--      permissive OR) — needed for rename/move/settings paths that don't hold
--      the pen; owner autosaves stay pen-guarded client-side.
--   2. The note realtime channel (`note:<file_id>`) becomes a PRIVATE channel.
--      Until now the keystroke mirror had no auth at all — anyone who learned a
--      note id could join the channel and watch (or inject) live broadcasts.
--      Now: joining/receiving requires being able to see the file; sending
--      broadcasts requires edit access; presence is open to all file viewers.
--
-- FIX: The initial version caused infinite recursion (files→pens→files→…).
-- Added security-definer functions to break the cycle.

-- ── Helper: check if user holds valid pen on a file (security definer to avoid RLS recursion) ─
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

-- ── 1. files UPDATE requires the pen (shared editors) ────────────────────────
-- Uses security-definer function to avoid circular RLS (files→pens→files).

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

-- ── 2. Private note channels (Realtime Authorization) ────────────────────────
-- Policies on realtime.messages govern private-channel broadcast + presence.
-- The topic is `note:<file_id>`; the files subquery runs under the requesting
-- user's own RLS, so channel visibility exactly mirrors file visibility.
-- (postgres_changes listeners on the same channel are unaffected — they are
-- authorized separately against the pens/shares tables' own RLS.)

-- Receive (broadcast + presence): anyone who can see the file.
create policy "note channel: receive with file access"
  on realtime.messages for select
  to authenticated
  using (
    realtime.topic() like 'note:%'
    and exists (
      select 1 from public.files f
      where f.id::text = split_part(realtime.topic(), ':', 2)
    )
  );

-- Send: presence tracking for anyone who can see the file (avatars),
-- broadcast (keystroke mirror, edit requests) only with edit access —
-- a view-only client cannot inject fake content into the mirror.
create policy "note channel: send with file access"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.topic() like 'note:%'
    and (
      (
        realtime.messages.extension = 'presence'
        and exists (
          select 1 from public.files f
          where f.id::text = split_part(realtime.topic(), ':', 2)
        )
      )
      or (
        realtime.messages.extension = 'broadcast'
        and public.can_edit_file(
          split_part(realtime.topic(), ':', 2)::uuid,
          public.requesting_user_id()
        )
      )
    )
  );
