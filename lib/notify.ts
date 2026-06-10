import type { SupabaseClient } from '@supabase/supabase-js'

type ShareEmailOpts = {
  to: string
  fileName: string
  sharedBy: string
  noteId: string
  recipientId?: string | null
}

type ShareNotificationOpts = {
  userId: string
  fileName: string
  sharedBy: string
  noteId: string
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

/**
 * Kept for call-site compatibility, but the edge function now handles push as
 * part of sendShareEmail. This is a no-op — push is fired via the email call
 * when recipientId is provided.
 */
export async function sendShareNotification(
  _supabase: SupabaseClient,
  _o: ShareNotificationOpts,
): Promise<void> {
  // Push is sent by the edge function when recipientId is included in sendShareEmail.
}
