-- 0004_realtime.sql — enable postgres_changes for the files lists.
-- Adds the files table to the supabase_realtime publication so insert/update/delete
-- events are streamed to subscribed clients (useFiles / useSharedFiles). RLS still
-- applies to which change events each client receives (the realtime socket carries the
-- Clerk token via realtime.setAuth — see lib/supabase.ts / useFileSync).
--
-- Turn-based live editing itself (note:<id> presence + broadcast) needs NO publication
-- change — Broadcast/Presence are not table-backed.

alter publication supabase_realtime add table files;
