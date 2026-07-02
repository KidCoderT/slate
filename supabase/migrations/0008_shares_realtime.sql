-- 0008_shares_realtime.sql — publish shares changes so grants/revokes are LIVE.
--
-- Before this, the only realtime table was files (0004, slimmed in 0007). But a
-- share grant/downgrade/revoke writes to SHARES, not files — so:
--   • a newly shared note didn't appear in the recipient's lists until refocus
--   • a revoked viewer kept receiving the open-note broadcast mirror all session
-- Subscribers: useSharedFiles (list refetch signal) and useFileSync (in-note
-- permission re-resolution).
--
-- RLS scopes INSERT/UPDATE events to the row's owner and recipient. DELETE events
-- carry only the primary key (default replica identity — kept deliberately) and
-- reach all shares subscribers; clients use them purely as a "re-check" signal and
-- never read the payload, so no share-row contents leak.
--
-- MANUAL STEP: run this in the Supabase SQL editor.

alter publication supabase_realtime add table shares;
