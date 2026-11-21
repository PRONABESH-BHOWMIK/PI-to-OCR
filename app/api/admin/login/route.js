// api/admin/login.js
// Admin login: checks ADMIN_USERNAME / ADMIN_PASSWORD_HASH from the environment
// and sets a signed session cookie on success.
import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  adminConfigured,
  createSession,
  getAdminConfig,
  verifyPassword,
} from '@/lib/admin-auth';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // one week

export async function POST(request) {
  const { username, password } = await request.json().catch(() => ({}));
  const config = getAdminConfig();

  if (!adminConfigured()) {
    return NextResponse.json(
      { error: 'Admin login is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH in the project environment.' },
      { status: 503 },
    );
  }

  if (username !== config.username || !verifyPassword(String(password || ''), config.passwordHash)) {
    return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
  }

  if (!config.sessionSecret) {
    console.warn('[admin] ADMIN_SESSION_SECRET is not set; using an ephemeral secret. Sessions will not be stable across instances.');
  }

  const response = NextResponse.json({ ok: true, username: config.username });
  response.cookies.set(SESSION_COOKIE, createSession(config.username), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
