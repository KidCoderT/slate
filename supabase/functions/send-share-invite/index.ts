// This file runs on Supabase's edge servers (Deno runtime). You never run it
// locally — just deploy it: `supabase functions deploy send-share-invite`
// No Deno install needed on your machine.

import { createClient } from 'npm:@supabase/supabase-js@2';

type Payload = {
  to: string
  fileName: string
  sharedBy: string
  noteId: string
  recipientId?: string | null
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const { to, fileName, sharedBy, noteId, recipientId } = (await req.json()) as Payload

  // ── Email via Mailgun ─────────────────────────────────────────────────────
  // Free plan: sign up at mailgun.com, get a sandboxXXXX.mailgun.org domain,
  // add testers as "authorized recipients" in the Mailgun dashboard.
  // Set these two secrets in Supabase: MAILGUN_API_KEY and MAILGUN_DOMAIN.
  // For production with a real domain, just update MAILGUN_DOMAIN — no code change.
  const mailgunKey = Deno.env.get('MAILGUN_API_KEY')
  const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN') // e.g. sandboxXXXX.mailgun.org
  if (mailgunKey && mailgunDomain) {
    const html = buildEmail({ fileName, sharedBy, noteId })
    const form = new FormData()
    form.append('from', `Slate <mailgun@${mailgunDomain}>`)
    form.append('to', to)
    form.append('subject', `${sharedBy} shared a note with you`)
    form.append('html', html)

    const emailRes = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${mailgunKey}`)}`,
      },
      body: form,
    })
    if (!emailRes.ok) {
      console.error('[send-share-invite] Mailgun error:', await emailRes.text())
    }
  } else {
    console.warn('[send-share-invite] MAILGUN_API_KEY or MAILGUN_DOMAIN not set — skipping email')
  }

  // ── Push notification via Expo Push API ───────────────────────────────────
  if (recipientId) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', recipientId)
      .single()

    const pushToken = profile?.expo_push_token
    if (pushToken) {
      const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          to: pushToken,
          title: 'New note shared with you',
          body: `${sharedBy} shared "${fileName}" with you`,
          data: { noteId, type: 'share' },
          sound: 'default',
        }),
      })
      if (!pushRes.ok) {
        console.error('[send-share-invite] Expo push error:', await pushRes.text())
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})

// ── Email template — Slate aesthetic ─────────────────────────────────────────
function buildEmail({ fileName, sharedBy, noteId }: Omit<Payload, 'to' | 'recipientId'>): string {
  const appUrl = Deno.env.get('APP_URL') ?? 'https://slate.app'
  const noteLink = `${appUrl}/note/${noteId}`
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sharedBy} shared a note with you</title>
</head>
<body style="margin:0;padding:0;background:#F0F1F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F1F4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;">

          <!-- Wordmark -->
          <tr>
            <td style="padding:40px 40px 0;">
              <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:700;color:#1A1A1A;letter-spacing:-0.8px;">Slate</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:24px 40px 0;">
              <hr style="border:none;border-top:1px solid #E8E8E6;margin:0;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:400;color:#6B6B6B;line-height:1.6;">
                ${escapeHtml(sharedBy)} shared a note with you
              </p>
              <p style="margin:0;font-size:22px;font-weight:600;color:#1A1A1A;letter-spacing:-0.4px;line-height:1.3;">
                ${escapeHtml(fileName || 'Untitled')}
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:32px 40px 0;">
              <a href="${noteLink}"
                 style="display:inline-block;background:#1A1A1A;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;letter-spacing:0.1px;">
                Open note
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:36px 40px 40px;">
              <hr style="border:none;border-top:1px solid #E8E8E6;margin:0 0 24px;" />
              <p style="margin:0;font-size:12px;color:#ADADAB;line-height:1.6;">
                You received this because ${escapeHtml(sharedBy)} shared a Slate note with you.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
