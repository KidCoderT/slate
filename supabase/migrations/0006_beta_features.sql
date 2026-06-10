-- Push token storage: lets the edge function deliver push notifications to the
-- recipient's device without needing a separate lookup service.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token text;

-- Unread tracking: NULL means the recipient has never opened this shared note.
-- set to now() by useFileSync when a shared note is first loaded.
ALTER TABLE shares ADD COLUMN IF NOT EXISTS seen_at timestamptz;
