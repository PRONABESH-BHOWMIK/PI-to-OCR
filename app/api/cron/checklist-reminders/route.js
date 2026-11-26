// app/api/cron/checklist-reminders/route.js
// Weekly (Sunday 09:00 UTC, see vercel.json) scan for expired checklist
// documents. Sends one reminder email per client to its dealing officer(s),
// listing every currently-expired document with the reminder count.
//
// Skipped for a client when:
//   - reminders are paused until a future date (clients.reminder_paused_until),
//   - there are no expired documents in the client's latest financial year,
//   - no officer email is on file,
//   - a reminder was already sent in the current week.
//
// Protected by Vercel Cron: the request must carry the CRON_SECRET value in
// the x-vercel-cron-secret header.
import { NextResponse } from 'next/server';
import { dbEnabled, query } from '@/lib/db';
import { sendEmail } from '@/lib/resend';
import { buildReminderEmail, expiredItems, todayIso } from '@/lib/checklist-core';

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('x-vercel-cron-secret');
  return header && header === secret;
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!dbEnabled) {
    return NextResponse.json({ error: 'Postgres not configured' }, { status: 503 });
  }

  const today = todayIso();
  const documentTypes = (await query('SELECT id, name, kind FROM document_types')) ?? [];

  // Latest financial-year record per client, among active users' clients.
  const fyRows =
    (await query(
      `SELECT f.id, f.client_id AS clientId, f.fy_label AS fyLabel, f.fy_end_date AS fyEndDate
         FROM fy_records f
         JOIN clients c ON c.id = f.client_id
         JOIN tool_users u ON u.id = c.user_id AND u.status = 'active'
        WHERE f.fy_end_date = (
          SELECT MAX(f2.fy_end_date) FROM fy_records f2 WHERE f2.client_id = f.client_id
        )
        ORDER BY f.client_id`,
    )) ?? [];

  let sent = 0, skipped = 0, errors = 0;

  for (const fy of fyRows) {
    const client = (
      (await query('SELECT id, name, ucic, reminder_paused_until AS reminderPausedUntil FROM clients WHERE id = $1', [fy.clientId])) ?? []
    )[0];
    if (!client) continue;

    // Reminders paused until a future date.
    if (client.reminderPausedUntil && today <= client.reminderPausedUntil) {
      skipped++;
      continue;
    }

    const items =
      (await query(
        `SELECT i.document_type_id AS documentTypeId, d.name AS documentTypeName, i.collected, i.expiry_date AS expiryDate
           FROM checklist_items i JOIN document_types d ON d.id = i.document_type_id
          WHERE i.fy_record_id = $1`,
        [fy.id],
      )) ?? [];

    const expired = expiredItems(
      { items, fyEndDate: fy.fyEndDate },
      documentTypes.map((d) => ({ id: d.id, name: d.name, kind: d.kind })),
      today,
    );
    if (expired.length === 0) continue;

    const officers =
      (await query('SELECT email FROM officer_emails WHERE fy_record_id = $1', [fy.id])) ?? [];
    const emails = officers.map((o) => o.email).filter(Boolean);
    if (emails.length === 0) continue;

    // Avoid duplicate sends within the week.
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const already = await query(
      'SELECT id FROM reminder_log WHERE client_id = $1 AND sent_at >= $2',
      [client.id, weekAgo],
    );
    if (already && already.length) {
      skipped++;
      continue;
    }

    const prior =
      (await query('SELECT COUNT(*)::int AS n FROM reminder_log WHERE client_id = $1', [client.id])) ?? [];
    const reminderCount = (prior?.[0]?.n ?? 0) + 1;

    const email = buildReminderEmail({
      client: { name: client.name, ucic: client.ucic },
      fyLabel: fy.fyLabel,
      expired,
      reminderCount,
      today,
    });

    const result = await sendEmail({ to: emails, subject: email.subject, text: email.text, html: email.html });
    if (result.sent) {
      await query('INSERT INTO reminder_log (client_id, fy_record_id) VALUES ($1, $2)', [client.id, fy.id]);
      sent++;
    } else {
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors, date: today });
}
