// This file runs on Supabase's edge servers (Deno runtime). You never run it
// locally — just deploy it: `supabase functions deploy send-share-invite`
// No Deno install needed on your machine.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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

  // ── Email via Gmail SMTP ──────────────────────────────────────────────────
  // No domain needed: sends from your own Gmail to anyone. Requires 2-Step
  // Verification on the account + a 16-char App Password (myaccount.google.com/apppasswords).
  // Set two secrets in Supabase: GMAIL_USER and GMAIL_APP_PASSWORD.
  // ponytail: Gmail SMTP, ~500/day, from personal address. Upgrade to domain + Resend
  // (HTTP API) when branding/volume matter, or fall back to port 587 if 465 is blocked.
  const gmailUser = Deno.env.get('GMAIL_USER')
  const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
  if (gmailUser && gmailPass) {
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPass },
      },
    })
    try {
      await client.send({
        from: `Slate <${gmailUser}>`,
        to,
        subject: `${sharedBy} shared a note with you`,
        content: `${sharedBy} shared "${fileName}" with you. Open Slate to read it.`,
        html: buildEmail({ fileName, sharedBy, noteId }),
      })
    } catch (e) {
      console.error('[send-share-invite] Gmail SMTP error:', e)
    } finally {
      await client.close()
    }
  } else {
    console.warn('[send-share-invite] GMAIL_USER/GMAIL_APP_PASSWORD not set — skipping email')
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
  const appUrl = Deno.env.get('APP_URL') ?? 'https://slateapp.expo.app'
  const noteLink = `${appUrl}/note/${noteId}`
  // Optional install link — shown only if DOWNLOAD_URL is set (the EAS build's install page).
  const downloadUrl = Deno.env.get('DOWNLOAD_URL')
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
          ${downloadUrl ? `
          <!-- Download fallback -->
          <tr>
            <td style="padding:20px 40px 0;">
              <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.6;">
                Don't have the app yet?
                <a href="${downloadUrl}" style="color:#1A1A1A;font-weight:600;text-decoration:underline;">Download Slate</a>
              </p>
            </td>
          </tr>` : ''}

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
