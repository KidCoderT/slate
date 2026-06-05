-- 0003_profile_colour.sql — per-user identity colour.
-- Every profile gets one persistent palette colour, used wherever the user is
-- represented (header avatar, ShareSheet owner row, live-editing presence dot/avatar).
-- This is the permitted non-monochrome use in Slate (APP_AESTHETIC §2).
--
-- IMPORTANT: the palette array below MUST stay byte-identical to AVATAR_COLORS in
-- theme/avatarColors.ts. #6BBF94 is intentionally absent (reserved for the saved /
-- active-editing status dot).

-- a. Add the column (nullable first so the backfill can run).
alter table profiles add column color text;

-- b. Backfill existing rows. random() is VOLATILE → evaluated per-row, so every
--    current profile gets a distinct, randomly-assigned palette colour (not one
--    shared default). Keep this array in sync with theme/avatarColors.ts.
update profiles
set color = (array['#4A87D6','#8A6DD1','#D4614A','#C4901C','#CC5C92','#3CAF82'])[1 + floor(random() * 6)::int]
where color is null;

-- c. Default is only a safety net — the client assigns a random colour from the code
--    palette on first insert (context/ProfileContext.tsx). Then lock the column NOT NULL.
alter table profiles alter column color set default '#8A6DD1';
alter table profiles alter column color set not null;
