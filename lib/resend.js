// lib/resend.js
// Send transactional emails through Resend (https://resend.com).
//
// Free tier: 3,000 emails/month, 100/day - ample for weekly checklist reminders.
// Configure RESEND_API_KEY and RESEND_FROM_EMAIL in the environment. When the
// API key is not set, sends are skipped with a warning so the rest of the app
// keeps working (reminders just won't send until it is configured).
const RESEND_API_URL = 'https://api.resend.com/emails';

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

/**
 * Send one email. Returns { sent: boolean, skipped?, error? }.
 * Never throws: failures are reported in the result so the cron keeps running.
 */
export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn('[resend] RESEND_API_KEY / RESEND_FROM_EMAIL not set - email skipped');
    return { sent: false, skipped: true };
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    return { sent: false, skipped: true, error: 'no recipients' };
  }

  const body = {
    from,
    to: recipients.length === 1 ? recipients[0] : recipients,
    subject,
    text,
  };
  if (html) body.html = html;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[resend] send failed:', response.status, detail.slice(0, 200));
      return { sent: false, error: `resend ${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error('[resend] request error:', error.message);
    return { sent: false, error: error.message };
  }
}
