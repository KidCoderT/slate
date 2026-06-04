/**
 * Notification + email delivery for sharing.
 *
 * STUBS for now — they only log. Wiring real delivery is a dedicated later
 * milestone:
 *   - sendShareEmail        → transactional email (Resend / SES) via an edge function
 *   - sendShareNotification → push via expo-notifications + stored device tokens + a
 *                             server-side sender
 *
 * Keeping them as a thin module means the call sites in useShares never change when
 * the real implementations land.
 */

type ShareEmailOpts = {
  to: string
  fileName: string
  sharedBy: string
}

type ShareNotificationOpts = {
  userId: string
  fileName: string
  sharedBy: string
}

/** Sent to every recipient (existing users AND brand-new invitees). */
export async function sendShareEmail(o: ShareEmailOpts): Promise<void> {
  // TODO(real): transactional email via Resend/SES from a Supabase edge function.
  console.log(`[notify] email → ${o.to}: "${o.sharedBy}" shared "${o.fileName}" with you`)
}

/** Sent only when the recipient already has an account. */
export async function sendShareNotification(o: ShareNotificationOpts): Promise<void> {
  // TODO(real): push via expo-notifications + stored device tokens + server sender.
  console.log(`[notify] in-app notification → ${o.userId}: "${o.sharedBy}" shared "${o.fileName}"`)
}
