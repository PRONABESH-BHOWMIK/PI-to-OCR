// app/api/admin/checklist/users/[id]/route.js
// Admin actions on a single tool user:
//   PATCH { status: 'active'|'paused'|'deactivated' }  - pause/activate/deactivate
//   PATCH { password }                                 - reset the password
//   DELETE                                              - remove the user (cascades to clients)
import { NextResponse } from 'next/server';
import { dbEnabled, query } from '@/lib/db';
import { getSession } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/checklist-auth';

const VALID_STATUS = ['active', 'paused', 'deactivated'];

export async function PATCH(request, { params }) {
  if (!getSession(request)) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'Postgres not configured' }, { status: 503 });

  const id = Number(params.id);
  const body = await request.json().catch(() => ({}));

  const existing = await query('SELECT id FROM tool_users WHERE id = $1', [id]);
  if (!existing || !existing.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    await query('UPDATE tool_users SET status = $1, updated_at = now() WHERE id = $2', [body.status, id]);
  }

  if (body.password !== undefined) {
    if (!body.password || String(body.password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    await query('UPDATE tool_users SET password_hash = $1, updated_at = now() WHERE id = $2', [
      hashPassword(String(body.password)),
      id,
    ]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  if (!getSession(request)) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'Postgres not configured' }, { status: 503 });

  const id = Number(params.id);
  const existing = await query('SELECT id FROM tool_users WHERE id = $1', [id]);
  if (!existing || !existing.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await query('DELETE FROM tool_users WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
