// app/api/checklist/login/route.js
// Tool-user login: verifies a group account (created by the admin) and sets a
// signed session cookie. Logs the login (with IP) for the admin's daily count.
import { NextResponse } from 'next/server';
import { dbEnabled, query } from '@/lib/db';
import {
  TOOL_SESSION_COOKIE,
  checkPassword,
  createSession,
  getClientIp,
  getSessionSecret,
} from '@/lib/checklist-auth';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // one week

export async function POST(request) {
  if (!dbEnabled) {
    return NextResponse.json(
      { error: 'Postgres is not configured. Set POSTGRES_URL and run scripts/sql/schema.sql.' },
      { status: 503 },
    );
  }

  const { username, password } = await request.json().catch(() => ({}));
  const normalized = String(username || '').trim();

  const rows = await query(
    `SELECT id, username, password_hash AS passwordHash, status
       FROM tool_users WHERE username = $1`,
    [normalized],
  );
  const user = rows?.[0];

  if (!user || user.status !== 'active' || !checkPassword(String(password || ''), user.passwordHash)) {
    return NextResponse.json({ error: 'Incorrect user ID or password' }, { status: 401 });
  }

  if (!process.env.CHECKLIST_SESSION_SECRET) {
    console.warn('[checklist] CHECKLIST_SESSION_SECRET is not set; using an ephemeral secret. Sessions will not be stable across instances.');
  }

  const ip = getClientIp(request);
  await query('INSERT INTO tool_login_events (user_id, ip) VALUES ($1, $2)', [user.id, ip]);

  const response = NextResponse.json({ ok: true, username: user.username });
  response.cookies.set(TOOL_SESSION_COOKIE, createSession(user.id, user.username, getSessionSecret()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
