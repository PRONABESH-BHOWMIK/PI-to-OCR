// lib/checklist-data.js
// Read/write helpers for the Import Client Document Checklist tool.
// All queries are scoped to a single tool user: a user only ever sees and
// writes their own clients.
import { query, withTransaction } from './db.js';

/** The ordered document types (admin-manageable). */
export async function getDocumentTypes() {
  return (
    (await query('SELECT id, name, kind, position FROM document_types ORDER BY position, id')) ?? []
  );
}

/**
 * Load every client for a user with its financial-year records, checklist
 * items, facility numbers and officer emails. Returns { documentTypes,
 * clients: [{ id, name, ucic, ircNumber, reminderPausedUntil, fys: [...] }] }.
 */
export async function loadUserData(userId) {
  const documentTypes = await getDocumentTypes();

  const clientRows =
    (await query(
      `SELECT id, name, ucic, irc_number AS ircNumber, reminder_paused_until AS reminderPausedUntil
         FROM clients WHERE user_id = $1 ORDER BY name`,
      [userId],
    )) ?? [];

  if (clientRows.length === 0) return { documentTypes, clients: [] };

  const clientIds = clientRows.map((c) => c.id);
  const fyRows =
    (await query(
      `SELECT id, client_id AS clientId, fy_label AS fyLabel, fy_end_date AS fyEndDate,
              commission_rate AS commissionRate, vat, mgt_fee_choice AS mgtFeeChoice,
              mgt_fee_value AS mgtFeeValue, swift_choice AS swiftChoice, swift_value AS swiftValue,
              note
         FROM fy_records WHERE client_id = ANY($1::bigint[]) ORDER BY fy_end_date`,
      [clientIds],
    )) ?? [];

  const fyIds = fyRows.map((f) => f.id);
  let itemRows = [], facRows = [], offRows = [];
  if (fyIds.length) {
    itemRows =
      (await query(
        `SELECT i.id, i.fy_record_id AS fyRecordId, i.document_type_id AS documentTypeId,
                d.name AS documentTypeName, d.kind, i.collected, i.expiry_date AS expiryDate
           FROM checklist_items i JOIN document_types d ON d.id = i.document_type_id
          WHERE i.fy_record_id = ANY($1::bigint[])`,
        [fyIds],
      )) ?? [];
    facRows =
      (await query(
        `SELECT id, fy_record_id AS fyRecordId, facility_number AS facilityNumber, linked_data AS linkedData
           FROM facility_numbers WHERE fy_record_id = ANY($1::bigint[])`,
        [fyIds],
      )) ?? [];
    offRows =
      (await query(
        `SELECT id, fy_record_id AS fyRecordId, email
           FROM officer_emails WHERE fy_record_id = ANY($1::bigint[])`,
        [fyIds],
      )) ?? [];
  }

  const fyMap = new Map(fyRows.map((f) => [f.id, { ...f, items: [], facilities: [], officers: [] }]));
  for (const it of itemRows) fyMap.get(it.fyRecordId)?.items.push(it);
  for (const f of facRows) fyMap.get(f.fyRecordId)?.facilities.push(f);
  for (const o of offRows) fyMap.get(o.fyRecordId)?.officers.push(o);

  const clients = clientRows.map((c) => ({
    ...c,
    fys: fyRows.filter((f) => f.clientId === c.id).map((f) => fyMap.get(f.id)),
  }));

  return { documentTypes, clients };
}

/** Normalize a UCIC for storage/comparison (trim + uppercase). */
export function normalizeUcic(value) {
  return String(value || '').trim().toUpperCase();
}

/**
 * Create a new client for a user. Returns the new client or throws
 * { status, message } on a duplicate UCIC.
 */
export async function createClient(userId, { name, ucic, ircNumber }) {
  const normalizedUcic = normalizeUcic(ucic);
  if (!normalizedUcic) {
    const err = new Error('UCIC is required');
    err.status = 400;
    throw err;
  }
  const existing = await query('SELECT id FROM clients WHERE ucic = $1', [normalizedUcic]);
  if (existing && existing.length) {
    const err = new Error(`A client with UCIC ${normalizedUcic} already exists.`);
    err.status = 409;
    throw err;
  }
  const rows = await query(
    `INSERT INTO clients (user_id, name, ucic, irc_number)
     VALUES ($1, $2, $3, $4) RETURNING id, name, ucic, irc_number AS ircNumber, reminder_paused_until AS reminderPausedUntil`,
    [userId, String(name || '').trim(), normalizedUcic, String(ircNumber || '').trim()],
  );
  return rows?.[0];
}

/**
 * Save a full client: update client fields and upsert every financial-year
 * record (data fields, checklist items, facility numbers, officer emails).
 * Idempotent. Throws { status, message } on duplicate UCIC.
 */
export async function saveClient(userId, payload) {
  const { clientId, name, ucic, ircNumber, reminderPausedUntil, fys = [] } = payload || {};
  if (!clientId) {
    const err = new Error('clientId is required');
    err.status = 400;
    throw err;
  }

  // Confirm ownership before touching anything.
  const owned = await query('SELECT id FROM clients WHERE id = $1 AND user_id = $2', [clientId, userId]);
  if (!owned || !owned.length) {
    const err = new Error('Client not found');
    err.status = 404;
    throw err;
  }

  const normalizedUcic = normalizeUcic(ucic);
  if (normalizedUcic) {
    const clash = await query('SELECT id FROM clients WHERE ucic = $1 AND id <> $2', [normalizedUcic, clientId]);
    if (clash && clash.length) {
      const err = new Error(`A client with UCIC ${normalizedUcic} already exists.`);
      err.status = 409;
      throw err;
    }
  }

  const documentTypes = await getDocumentTypes();
  const typeByName = new Map(documentTypes.map((d) => [d.name, d]));

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE clients
          SET name = $1, ucic = $2, irc_number = $3, reminder_paused_until = $4, updated_at = now()
        WHERE id = $5`,
      [String(name || '').trim(), normalizedUcic || '', String(ircNumber || '').trim(), reminderPausedUntil || null, clientId],
    );

    for (const fy of fys) {
      const fyLabel = String(fy.fyLabel || '').trim();
      const fyEndDate = String(fy.fyEndDate || '').trim() || null;
      if (!fyLabel) continue;

      const fyRes = await client.query(
        `INSERT INTO fy_records (client_id, fy_label, fy_end_date) VALUES ($1, $2, $3)
         ON CONFLICT (client_id, fy_label) DO UPDATE SET fy_end_date = EXCLUDED.fy_end_date
         RETURNING id`,
        [clientId, fyLabel, fyEndDate],
      );
      const fyId = fyRes.rows[0].id;

      // Data fields.
      await client.query(
        `UPDATE fy_records
            SET commission_rate = $1, vat = $2, mgt_fee_choice = $3, mgt_fee_value = $4,
                swift_choice = $5, swift_value = $6, note = $7
          WHERE id = $8`,
        [
          String(fy.commissionRate || ''),
          String(fy.vat || ''),
          String(fy.mgtFeeChoice || ''),
          String(fy.mgtFeeValue || ''),
          String(fy.swiftChoice || ''),
          String(fy.swiftValue || ''),
          String(fy.note || ''),
          fyId,
        ],
      );

      // Checklist items: replace this FY's items with the submitted set.
      await client.query('DELETE FROM checklist_items WHERE fy_record_id = $1', [fyId]);
      for (const item of fy.items || []) {
        const def = typeByName.get(item.name);
        if (!def) continue; // ignore unknown document types
        await client.query(
          `INSERT INTO checklist_items (fy_record_id, document_type_id, collected, expiry_date)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (fy_record_id, document_type_id)
           DO UPDATE SET collected = EXCLUDED.collected, expiry_date = EXCLUDED.expiry_date`,
          [fyId, def.id, Boolean(item.collected), item.expiryDate || null],
        );
      }

      // Facility numbers: replace set.
      await client.query('DELETE FROM facility_numbers WHERE fy_record_id = $1', [fyId]);
      for (const f of fy.facilities || []) {
        await client.query(
          `INSERT INTO facility_numbers (fy_record_id, facility_number, linked_data) VALUES ($1, $2, $3)`,
          [fyId, String(f.facilityNumber || ''), String(f.linkedData || '')],
        );
      }

      // Officer emails: replace set.
      await client.query('DELETE FROM officer_emails WHERE fy_record_id = $1', [fyId]);
      for (const o of fy.officers || []) {
        const email = String(o.email || '').trim();
        if (!email) continue;
        await client.query(
          `INSERT INTO officer_emails (fy_record_id, email) VALUES ($1, $2)`,
          [fyId, email],
        );
      }
    }
  });

  return { id: clientId };
}

/** Delete a client (and, via cascade, its FY records) for a user. */
export async function deleteClient(userId, clientId) {
  const owned = await query('SELECT id FROM clients WHERE id = $1 AND user_id = $2', [clientId, userId]);
  if (!owned || !owned.length) return false;
  await query('DELETE FROM clients WHERE id = $1 AND user_id = $2', [clientId, userId]);
  return true;
}
