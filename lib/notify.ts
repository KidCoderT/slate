import type { SupabaseClient } from '@supabase/supabase-js'

type ShareEmailOpts = {
  to: string
  fileName: string
  sharedBy: string
  noteId: string
  recipientId?: string | null
}

/**
 * Fires the send-share-invite edge function which handles BOTH the transactional
 * email (Resend) and the push notification (Expo push API) in one call.
 *
 * Sent to every recipient — existing users AND pending invitees.
 */
export async function sendShareEmail(
  supabase: SupabaseClient,
  o: ShareEmailOpts,
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-share-invite', {
    body: {
      to: o.to,
      fileName: o.fileName,
      sharedBy: o.sharedBy,
      noteId: o.noteId,
      recipientId: o.recipientId ?? null,
    },
  })
  if (error) console.warn('[notify] send-share-invite failed:', error.message)
}
