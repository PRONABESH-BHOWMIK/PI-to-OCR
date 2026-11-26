// app/api/admin/checklist/document-types/route.js
// Admin manages the checklist document types (add / remove).
//   GET   - list document types in order.
//   POST  - add { name, kind } where kind is 'fy_based' | 'dated'.
//   DELETE - remove a document type by id (via ?id=).
import { NextResponse } from 'next/server';
import { dbEnabled, query } from '@/lib/db';
import { getSession } from '@/lib/admin-auth';

const VALID_KIND = ['fy_based', 'dated'];

export async function GET(request) {
  if (!getSession(request)) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'Postgres not configured' }, { status: 503 });

  const rows = await query('SELECT id, name, kind, position FROM document_types ORDER BY position, id');
  return NextResponse.json({ documentTypes: rows ?? [] });
}

export async function POST(request) {
  if (!getSession(request)) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'Postgres not configured' }, { status: 503 });

  const { name, kind } = await request.json().catch(() => ({}));
  const trimmed = String(name || '').trim();
  if (!trimmed) return NextResponse.json({ error: 'Document type name is required' }, { status: 400 });
  if (!VALID_KIND.includes(kind)) return NextResponse.json({ error: 'kind must be fy_based or dated' }, { status: 400 });

  const existing = await query('SELECT id FROM document_types WHERE name = $1', [trimmed]);
  if (existing && existing.length) return NextResponse.json({ error: 'That document type already exists' }, { status: 409 });

  const maxPos = (await query('SELECT COALESCE(MAX(position), 0)::int AS p FROM document_types'))?.[0]?.p ?? 0;
  const rows = await query(
    'INSERT INTO document_types (name, kind, position) VALUES ($1, $2, $3) RETURNING id, name, kind, position',
    [trimmed, kind, maxPos + 1],
  );
  return NextResponse.json({ ok: true, documentType: rows?.[0] }, { status: 201 });
}

export async function DELETE(request) {
  if (!getSession(request)) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'Postgres not configured' }, { status: 503 });

  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  await query('DELETE FROM document_types WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
