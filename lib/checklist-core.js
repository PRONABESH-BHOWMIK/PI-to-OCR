// lib/checklist-core.js
// Shared logic for the Import Client Document Checklist tool: financial-year
// parsing, document expiry / status, and reminder email composition.
//
// Financial years run 01-07 to 30-06. A label like '2026-27' starts on
// 2026-07-01 and ends on 2027-06-30.

/** Parse a 'YYYY-YY' label into { start, end } ISO date strings, or null. */
export function parseFy(label) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(label || '').trim());
  if (!m) return null;
  const startYear = Number(m[1]);
  const endYear = startYear + 1; // '2026-27' -> closes in 2027
  return {
    start: `${startYear}-07-01`,
    end: `${endYear}-06-30`,
    label: `${m[1]}-${m[2]}`,
  };
}

/** The list of document types as seeded in the DB (used for tests / fallback). */
export const DEFAULT_DOCUMENT_TYPES = [
  { name: 'IRC', kind: 'fy_based' },
  { name: 'Trade License', kind: 'fy_based' },
  { name: 'Income tax return ACK', kind: 'fy_based' },
  { name: 'Membership certificate', kind: 'dated' },
  { name: 'Latest sanction', kind: 'dated' },
  { name: 'Trade TP & KYC', kind: 'dated' },
];

/** Today as an ISO date string (YYYY-MM-DD) in UTC. */
export function todayIso(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/**
 * Compute the status of a single checklist row for display.
 *
 * kind 'fy_based': valid through the FY end date, expires the day after.
 * kind 'dated':    valid through the entered expiry date, expires the day after.
 *
 * Returns one of:
 *   { state: 'valid' }      - collected and within date -> light green
 *   { state: 'expired' }    - collected but outdated -> light red
 *   { state: 'uncollected' }- not collected -> neutral
 */
export function itemStatus(item, { kind, fyEndDate, today }) {
  const todayStr = today || todayIso();
  if (!item?.collected) return { state: 'uncollected' };

  let expiry;
  if (kind === 'fy_based') {
    expiry = fyEndDate || null;
  } else {
    expiry = item.expiryDate || null;
  }
  if (!expiry) return { state: 'valid' }; // no date -> treat as current
  return todayStr > expiry ? { state: 'expired' } : { state: 'valid' };
}

/**
 * Compute the overall status of a financial-year record:
 *   expiredCount, validCount, uncollectedCount.
 */
export function fyStatus(record, documentTypes, today) {
  const counts = { expired: 0, valid: 0, uncollected: 0 };
  for (const item of record.items || []) {
    const kind = documentTypes.find((d) => d.id === item.documentTypeId || d.name === item.documentTypeName)?.kind || 'dated';
    const { state } = itemStatus(item, { kind, fyEndDate: record.fyEndDate, today });
    counts[state] += 1;
  }
  return counts;
}

/** Rows that should trigger a reminder: collected AND expired. */
export function expiredItems(record, documentTypes, today) {
  return (record.items || [])
    .map((item) => {
      const def = documentTypes.find((d) => d.id === item.documentTypeId || d.name === item.documentTypeName);
      const kind = def?.kind || 'dated';
      const status = itemStatus(item, { kind, fyEndDate: record.fyEndDate, today });
      const name = def?.name || item.documentTypeName || 'Document';
      return { name, kind, ...status, expiry: kind === 'fy_based' ? record.fyEndDate : item.expiryDate };
    })
    .filter((row) => row.state === 'expired');
}

/** The next financial-year label after a given label, for the year dropdown. */
export function nextFyLabel(label) {
  const parsed = parseFy(label);
  if (!parsed) return null;
  const startYear = Number(parsed.label.slice(0, 4)) + 1;
  return `${startYear}-${String(Number(parsed.label.slice(5, 7)) ).padStart(2, '0')}`;
}

/**
 * Build the reminder email for one client. Returns { subject, text, html }.
 * One email per client to the dealing officer(s), listing all expired docs
 * with the reminder count.
 */
export function buildReminderEmail({ client, fyLabel, expired, reminderCount, today }) {
  const subject = `Document expiry reminder: ${client.name} (${fyLabel})`;
  const list = expired
    .map((e) => `- ${e.name}${e.expiry ? ` — expired ${e.expiry}` : ''}`)
    .join('\n');
  const text = [
    `Reminder ${reminderCount} — ${today}`,
    `Client: ${client.name} (UCIC: ${client.ucic})`,
    `Financial year: ${fyLabel}`,
    '',
    `${expired.length} document(s) are expired and need renewal:`,
    list,
    '',
    'Please collect the renewed documents and update the checklist. Reminders will',
    'continue weekly until the documents are current or reminders are paused.',
  ].join('\n');

  const rows = expired
    .map(
      (e) =>
        `<tr><td style="padding:4px 8px;border:1px solid #D9E0DC;">${e.name}</td>` +
        `<td style="padding:4px 8px;border:1px solid #D9E0DC;">${e.expiry || '—'}</td></tr>`,
    )
    .join('');
  const html = `<div style="font-family:system-ui,Arial,sans-serif;color:#16322A;max-width:560px;">
  <h2 style="font-size:18px;">Document expiry reminder — ${client.name}</h2>
  <p style="color:#5C6F67;">Reminder ${reminderCount} &middot; ${today} &middot; Financial year ${fyLabel}</p>
  <p>Client: <strong>${client.name}</strong> (UCIC: ${client.ucic})</p>
  <p><strong>${expired.length}</strong> document(s) are expired and need renewal:</p>
  <table style="border-collapse:collapse;margin:12px 0;">
    <thead><tr style="background:#0E4D3A;color:#fff;"><th style="padding:6px 8px;border:1px solid #D9E0DC;text-align:left;">Document</th><th style="padding:6px 8px;border:1px solid #D9E0DC;text-align:left;">Expired on</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#5C6F67;">Please collect the renewed documents and update the checklist. Reminders continue weekly until the documents are current or reminders are paused.</p>
</div>`;
  return { subject, text, html };
}
