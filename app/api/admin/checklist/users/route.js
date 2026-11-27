// app/api/admin/checklist/users/route.js
// Admin manages checklist tool-user (group) accounts.
// GET  - list all tool users with client counts and last activity.
// POST - create a tool user { username, password }.
import { NextResponse } from 'next/server';
import { dbEnabled, query } from '@/lib/db';
import { getSession } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/checklist-auth';

export async function GET(request) {
  if (!getSession(request)) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!dbEnabled) {
    return NextResponse.json({ error: 'Postgres not configured' }, { status: 503 });
  }

  const rows =
    (await query(
      `SELECT u.id, u.username, u.status, u.created_at AS createdAt,
              (SELECT COUNT(*)::int FROM clients c WHERE c.user_id = u.id) AS clientCount,
              (SELECT MAX(created_at) FROM tool_login_events e WHERE e.user_id = u.id) AS lastLogin
         FROM tool_users u ORDER BY u.id`,
    )) ?? [];
  return NextResponse.json({ users: rows.map((r) => ({ ...r, lastLogin: r.lastLogin ? new Date(r.lastLogin).toISOString() : null })) });
}

export async function POST(request) {
  if (!getSession(request)) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!dbEnabled) {
    return NextResponse.json({ error: 'Postgres not configured' }, { status: 503 });
  }

  const { username, password } = await request.json().catch(() => ({}));
  const name = String(username || '').trim();
  if (!name) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  if (!password || String(password).length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const existing = await query('SELECT id FROM tool_users WHERE username = $1', [name]);
  if (existing && existing.length) {
    return NextResponse.json({ error: 'That user ID already exists' }, { status: 409 });
  }

  const hash = hashPassword(String(password));
  const rows = await query(
    `INSERT INTO tool_users (username, password_hash) VALUES ($1, $2)
     RETURNING id, username, status, created_at AS createdAt`,
    [name, hash],
  );
  return NextResponse.json({ ok: true, user: { ...rows[0], createdAt: new Date(rows[0].createdAt).toISOString() } }, { status: 201 });
}
