-- 0009_pens.sql — one pen per slate, held as a short lease.
--
-- The pen row is the SINGLE source of truth for "who is writing". Presence no
-- longer carries an `editing` flag (it only draws avatars); broadcast no longer
-- carries lock signals (it only mirrors keystrokes). Claiming the pen is one
-- atomic UPDATE that Postgres serializes — exactly one winner, always.
--
-- No cleanup jobs: expiry is checked lazily inside claim_pen. An abandoned
-- lease (crashed tab, killed app) is simply claimable again after it expires.
-- The holder heartbeats every ~5s by re-calling claim_pen (TTL 15s).

create table pens (
  file_id     uuid primary key references files(id) on delete cascade,
  holder_id   text references profiles(id) on delete set null,
  holder_name text,          -- denormalised: viewers render "Maya is writing" without a join
  expires_at  timestamptz    -- lease deadline; null when the pen is free
);

alter table pens enable row level security;

-- Read: anyone who can see the file can see its pen.
-- (files RLS applies inside the subquery for the requesting user, so this
-- inherits owner/shared/public visibility without restating it.)
create policy "pens: visible with file"
  on pens for select
  using (exists (select 1 from files f where f.id = pens.file_id));

-- No insert/update/delete policies: ALL writes go through the
-- security-definer functions below. Clients cannot forge a pen.

-- True when the user owns the file or has an 'edit' share on it.
create or replace function can_edit_file(p_file uuid, p_user text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from files where id = p_file and owner_id = p_user)
      or exists (select 1 from shares
                 where resource_type = 'file'
                   and resource_id = p_file
                   and shared_with = p_user
                   and permission = 'edit')
$$;

-- Claim (or extend) the pen. Atomic: the upsert row-locks the pen row, so
-- simultaneous claims have exactly one winner — no client-side tiebreaks.
-- Returns the resulting row; the caller checks holder_id to learn who won.
-- Calling it while already holding the pen extends the lease (the heartbeat).
create or replace function claim_pen(p_file uuid)
returns pens
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := requesting_user_id();
  pen pens;
begin
  if not can_edit_file(p_file, me) then
    raise exception 'no edit access';
  end if;
  insert into pens (file_id, holder_id, holder_name, expires_at)
  values (p_file, me,
          (select coalesce(display_name, 'Someone') from profiles where id = me),
          now() + interval '15 seconds')
  on conflict (file_id) do update
    set holder_id   = excluded.holder_id,
        holder_name = excluded.holder_name,
        expires_at  = excluded.expires_at
    where pens.holder_id is null                  -- pen is free
       or pens.holder_id = excluded.holder_id     -- it's mine: heartbeat / extend
       or pens.expires_at < now()                 -- abandoned lease: reclaimable
  returning * into pen;
  if pen.file_id is null then                     -- WHERE failed → someone else holds it
    select * into pen from pens where file_id = p_file;
  end if;
  return pen;
end $$;

-- Release: only the holder can free the pen. UPDATE (not DELETE) so the
-- realtime event carries the full new row to every watcher.
create or replace function release_pen(p_file uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update pens
  set holder_id = null, holder_name = null, expires_at = null
  where file_id = p_file and holder_id = requesting_user_id()
$$;

-- Handover: the holder writes the grantee's name straight onto the pen.
-- The pen is never free mid-handover — stealing is impossible by construction.
-- The grantee gets a fresh 15s lease; if they never show up, it expires like
-- any other abandoned lease.
create or replace function transfer_pen(p_file uuid, p_to text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not can_edit_file(p_file, p_to) then
    raise exception 'grantee has no edit access';
  end if;
  update pens
  set holder_id   = p_to,
      holder_name = (select coalesce(display_name, 'Someone') from profiles where id = p_to),
      expires_at  = now() + interval '15 seconds'
  where file_id = p_file and holder_id = requesting_user_id();
end $$;

-- Fast-path reaper: when the holder's presence drops (crash / killed tab), any
-- editor may SHORTEN the lease to just over one heartbeat period — never free
-- or steal it. A live holder re-extends within 5s, so this can never hurt them
-- (even if spammed); a dead holder's pen frees in ~6s instead of 15.
create or replace function nudge_pen(p_file uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update pens
  set expires_at = least(expires_at, now() + interval '6 seconds')
  where file_id = p_file
    and holder_id is not null
    and can_edit_file(p_file, requesting_user_id())
$$;

grant execute on function can_edit_file(uuid, text) to authenticated;
grant execute on function claim_pen(uuid) to authenticated;
grant execute on function release_pen(uuid) to authenticated;
grant execute on function transfer_pen(uuid, text) to authenticated;
grant execute on function nudge_pen(uuid) to authenticated;

-- Live pen updates for every open note (same pattern as 0004 files / 0008 shares).
alter publication supabase_realtime add table pens;
